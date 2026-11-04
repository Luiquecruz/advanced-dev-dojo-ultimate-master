import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { connect } from 'node:net';
import { CHILD_HEAP_LIMIT_MB, CHILD_WASM_MEMORY_LIMIT_MB, childExecArgv, PythonSandbox } from './pythonSandbox';
import escapeScanSource from './pythonEscapeScan.py?raw';
import { processAllowList } from './pythonSandboxProcess';

const LIMIT_MS = 4000;
const RESTART_ALLOWANCE_MS = 45000;
const sandbox = new PythonSandbox({ testTimeoutMs: LIMIT_MS, runTimeoutMs: LIMIT_MS });

const lesson = `
import asyncio
import time

async def fetch(n):
    await asyncio.sleep(0)
    return n * 2

async def forgets_await():
    fetch(1)
    return "done"

def spin():
    while True:
        pass

async def spin_async():
    while True:
        pass

def block():
    time.sleep(60)
`;

function grade(tests: string, files: Record<string, string> = { 'main.py': lesson }) {
  return sandbox.runTests({ files, entry: 'main.py', tests: tests.trim() + '\n' });
}

beforeAll(() => sandbox.start(), 60000);
afterAll(() => sandbox.stop());

describe('per-test wall-clock limit', () => {
  it.each([
    ['sync infinite loop', 'def _():\n    mod.spin()'],
    ['async busy loop', 'async def _():\n    await mod.spin_async()'],
    ['blocking time.sleep', 'def _():\n    mod.block()'],
  ])('stops a %s, fails only that test and keeps grading', async (_, body) => {
    const report = await grade(`
@test("before")
def _():
    assert 1 + 1 == 2

@test("hangs")
${body}

@test("after")
async def _():
    assert await mod.fetch(2) == 4
`);
    expect(report.compileError).toBeUndefined();
    expect(report.results.map((result) => [result.name, result.passed])).toEqual([
      ['before', true],
      ['hangs', false],
      ['after', true],
    ]);
    expect(report.results[1].error).toContain(`did not finish within ${LIMIT_MS}ms`);
    expect(report.durationMs).toBeLessThan(LIMIT_MS + RESTART_ALLOWANCE_MS);
  }, 60000);

  it('stops a module that loops at import time in every test', async () => {
    const report = await grade('@test("a")\ndef _():\n    pass\n\n@test("b")\ndef _():\n    pass', { 'main.py': 'while True:\n    pass\n' });
    expect(report.results.map((result) => result.passed)).toEqual([false, false]);
  }, 60000);

  it('stops a Run demo that never ends', async () => {
    const output: string[] = [];
    const code = await sandbox.runProgram({ 'main.py': 'while True:\n    pass\n' }, 'main.py', (level, text) => output.push(`${level}:${text}`));
    expect(code).toBe(1);
    expect(output.join('\n')).toContain(`did not finish within ${LIMIT_MS}ms`);
  }, 60000);
});

describe('host isolation', () => {
  it('keeps the host environment, Node built-ins, module loading and network out of reach', async () => {
    process.env.DOJO_SANDBOX_PROBE = 'host-secret';
    const isolated = new PythonSandbox();
    try {
      const report = await isolated.runTests({
        files: { 'main.py': 'x = 1\n' },
        entry: 'main.py',
        tests: `
import js
import os
from pyodide.ffi import JsException

@test("js has no process")
def _():
    assert not hasattr(js, "process")

@test("os.environ has no host variables")
def _():
    assert "DOJO_SANDBOX_PROBE" not in os.environ

@test("code generation is disabled")
def _():
    assert getattr(js, "eval", None) is None
    for attempt in (lambda: js.Object.constructor("return 1"), lambda: js.Promise.constructor("return 1"), lambda: js.setTimeout("1", 0)):
        try:
            attempt()
        except JsException:
            continue
        raise AssertionError("code generation was not refused")

@test("network functions are gone")
async def _():
    assert getattr(js, "fetch", None) is None
    from pyodide.http import pyfetch
    error = await capture_error(pyfetch("https://example.com"))
    assert error is not None

@test("NODEFS cannot be mounted")
async def _():
    import pyodide_js
    assert getattr(pyodide_js.FS.filesystems, "NODEFS", None) is None
    assert getattr(pyodide_js, "mountNodeFS", None) is None

@test("package installation refuses URLs")
async def _():
    import pyodide_js
    error = await capture_error(pyodide_js.loadPackage("https://example.com/evil-0.1-py3-none-any.whl"))
    assert "disabled" in str(error)
`,
      });
      expect(report.results.filter((result) => !result.passed)).toEqual([]);
      expect(report.results).toHaveLength(6);
    } finally {
      isolated.stop();
      delete process.env.DOJO_SANDBOX_PROBE;
    }
  }, 60000);
});

const REMOVED_PROCESS_MEMBERS = [
  '_debugProcess', '_debugEnd', '_kill', 'kill', 'abort', 'reallyExit', 'exit', 'dlopen', 'binding', '_linkedBinding', 'getBuiltinModule',
  'report', 'loadEnvFile', 'send', 'on', 'emit', 'chdir', 'umask', 'setuid', 'setgid', 'execve', '_rawDebug', 'openStdin', 'mainModule',
  'permission', 'pid', 'ppid', 'stdin', 'stdout', 'stderr', 'hrtime', 'memoryUsage', 'resourceUsage', 'channel', 'disconnect',
];

function inspectorListening(): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect({ host: '127.0.0.1', port: 9229 });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
  });
}

describe('code generators reachable from Python', () => {
  it('finds no original Function, eval or async/generator constructor among the objects reachable from js and pyodide_js', async () => {
    const scanner = new PythonSandbox({ testTimeoutMs: 60000 });
    try {
      const report = await scanner.runTests({
        files: { 'main.py': 'x = 1\n' },
        entry: 'main.py',
        tests: `${escapeScanSource}

@test("no code generator is reachable")
def _():
    found, visited = scan()
    assert visited > 1000
    assert found == []
`,
      });
      expect(report.compileError).toBeUndefined();
      expect(report.results).toEqual([{ name: 'no code generator is reachable', passed: true }]);
    } finally {
      scanner.stop();
    }
  }, 120000);
});

describe('process allow-list', () => {
  it('starts children under the permission model without signal-activated inspector', () => {
    const flags = childExecArgv();
    expect(flags).toContain('--permission');
    expect(flags).toContain('--disable-sigusr1');
    expect(flags.some((flag) => /^--allow-(fs-write|child-process|worker|net|addons|wasi|inspector|ffi)/.test(flag))).toBe(false);
  });

  it.each(REMOVED_PROCESS_MEMBERS)('the process seen after lock-down has no %s', (name) => {
    expect((processAllowList(process) as Record<string, unknown>)[name]).toBeUndefined();
  });

  it('caps the JavaScript heap and the wasm memory of every child', () => {
    expect(childExecArgv()).toContain(`--max-old-space-size=${CHILD_HEAP_LIMIT_MB}`);
    expect(childExecArgv()).toContain(`--wasm-max-mem-pages=${(CHILD_WASM_MEMORY_LIMIT_MB * 1024 * 1024) / 65536}`);
  });

  it('fails a test that allocates past the memory cap and keeps grading', async () => {
    const report = await grade(`
@test("allocates 1.5 GB")
def _():
    blob = bytearray(1536 * 1024 * 1024)
    assert len(blob) > 0

@test("after")
def _():
    assert sum(range(10)) == 45
`);
    expect(report.results.map((result) => [result.name, result.passed])).toEqual([
      ['allocates 1.5 GB', false],
      ['after', true],
    ]);
  }, 60000);

  it('cannot open the inspector on the parent process with _debugProcess', async () => {
    const listeningBefore = await inspectorListening();
    const report = await grade(`
import js

@test("_debugProcess cannot be called")
def _():
    from pyodide.ffi import JsException
    try:
        js.Object.constructor("process._debugProcess(process.ppid)")()
    except JsException:
        return
    raise AssertionError("_debugProcess was reachable")
`);
    expect(report.results[0]).toEqual({ name: '_debugProcess cannot be called', passed: true });
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (!listeningBefore) {
      expect(await inspectorListening()).toBe(false);
    }
  });
});

describe('interpreter state between tests', () => {
  it('uses a fixed string hash seed', async () => {
    const report = await grade('import sys\n\n@test("seed")\ndef _():\n    assert sys.flags.hash_randomization == 0');
    expect(report.results[0]).toEqual({ name: 'seed', passed: true });
  });

  it('restores builtins, import hooks, paths, loggers, tracing and scratch files after each test', async () => {
    const report = await grade(`
import builtins
import logging
import os
import sys

@test("pollutes")
def _():
    builtins.len = lambda value: 0
    sys.meta_path.insert(0, object())
    sys.path.append("/nowhere")
    logging.getLogger("dojo.probe").addHandler(logging.NullHandler())
    logging.getLogger().addHandler(logging.NullHandler())
    sys.settrace(lambda *args: None)
    sys.setrecursionlimit(50)
    os.environ["PROBE"] = "1"
    with open("/tmp/probe.txt", "w") as file:
        file.write("x")
    import json as real_json
    real_json.JSONEncoder.default = lambda self, value: "patched"
    import copy
    copy._deepcopy_dispatch[list] = lambda value, memo: "patched"
    import gc
    gc.disable()
    sys.modules["json"] = None

@test("starts clean")
async def _():
    import json
    assert len([1, 2]) == 2
    assert all(isinstance(finder, type) or hasattr(finder, "find_spec") for finder in sys.meta_path)
    assert "/nowhere" not in sys.path
    assert "dojo.probe" not in logging.Logger.manager.loggerDict
    assert not any(isinstance(handler, logging.NullHandler) for handler in logging.getLogger().handlers)
    assert sys.gettrace() is None
    assert sys.getrecursionlimit() >= 1000
    assert "PROBE" not in os.environ
    assert not os.path.exists("/tmp/probe.txt")
    assert json.dumps([1]) == "[1]"
    error = await capture_error(lambda: json.dumps(object()))
    assert isinstance(error, TypeError)
    import copy
    assert copy.deepcopy([1]) == [1]
    import gc
    assert gc.isenabled()
`);
    expect(report.compileError).toBeUndefined();
    expect(report.results.map((result) => [result.name, result.passed, result.error])).toEqual([
      ['pollutes', true, undefined],
      ['starts clean', true, undefined],
    ]);
  });
});

describe('fresh interpreter per lesson', () => {
  it('does not leak in-place stdlib mutations from one lesson to the next', async () => {
    const polluter = await grade(`
import collections.abc
import json

@test("pollutes in place")
def _():
    json.JSONEncoder.default = lambda self, value: "patched"
    collections.abc.Mapping.register(list)
    assert isinstance([], collections.abc.Mapping)
`);
    expect(polluter.results[0].passed).toBe(true);
    const next = await grade(`
import collections.abc
import json

@test("next lesson starts clean")
async def _():
    error = await capture_error(lambda: json.dumps(object()))
    assert isinstance(error, TypeError)
    assert not isinstance([], collections.abc.Mapping)
`);
    expect(next.results).toEqual([{ name: 'next lesson starts clean', passed: true }]);
  }, 60000);
});

describe('fresh interpreter per test run', () => {
  it('does not share an interpreter between the solution and the starter of one lesson', async () => {
    const tests = '@test("acts")\ndef _():\n    mod.act()\n';
    const solution = 'import collections.abc\n\ndef act():\n    collections.abc.Mapping.register(list)\n';
    const starter = 'import collections.abc\n\ndef act():\n    assert not isinstance([], collections.abc.Mapping)\n';
    expect((await sandbox.runTests({ files: { 'main.py': solution }, entry: 'main.py', tests })).results[0].passed).toBe(true);
    expect((await sandbox.runTests({ files: { 'main.py': starter }, entry: 'main.py', tests })).results[0].passed).toBe(true);
  });
});

describe('never-awaited coroutines', () => {
  it('fails a sync test that asserts on a coroutine instead of awaiting it', async () => {
    const report = await grade('@test("truthy coroutine")\ndef _():\n    assert mod.fetch(2)');
    expect(report.results[0].passed).toBe(false);
    expect(report.results[0].error).toContain("coroutine 'fetch' was never awaited");
  });

  it('fails when learner code forgets an await', async () => {
    const report = await grade('@test("forgets")\nasync def _():\n    assert await mod.forgets_await() == "done"');
    expect(report.results[0].passed).toBe(false);
    expect(report.results[0].error).toContain("coroutine 'fetch' was never awaited");
  });

  it('accepts awaited coroutines and coroutines closed on purpose', async () => {
    const report = await grade(`
import inspect

@test("awaited")
async def _():
    assert await mod.fetch(3) == 6

@test("closed")
def _():
    coroutine = mod.fetch(1)
    assert inspect.iscoroutine(coroutine)
    coroutine.close()
`);
    expect(report.results.filter((result) => !result.passed)).toEqual([]);
  });
});
