import { constants as fsConstants } from 'node:fs';
import { registerHooks } from 'node:module';
import { constants as osConstants } from 'node:os';
import { loadPyodide, type PyodideAPI } from 'pyodide';
import { createPythonEngine, PYTHON_ENV, type PythonEngine } from '../engines/python/engine';
import type { SandboxRequest, SandboxResponse } from './pythonSandbox';

const JS_GLOBALS = [
  'Object', 'Array', 'Promise', 'Error', 'TypeError', 'RangeError', 'SyntaxError', 'JSON', 'Math', 'Number', 'String', 'Boolean', 'Symbol',
  'BigInt', 'Map', 'Set', 'WeakMap', 'WeakSet', 'Date', 'RegExp', 'ArrayBuffer', 'DataView', 'Uint8Array', 'Int32Array', 'Float64Array',
  'setTimeout', 'clearTimeout', 'queueMicrotask', 'TextEncoder', 'TextDecoder',
];
const NETWORK_GLOBALS = ['fetch', 'WebSocket', 'EventSource', 'XMLHttpRequest'];
const HOST_FILE_SYSTEMS = ['NODEFS', 'NODERAWFS'];
const SNAPSHOT_MODULES = [
  'ast', 'asyncio', 'builtins', 'gc', 'importlib', 'inspect', 'json', 'logging', 'os', 'random', 'shutil', 'traceback', 'types', 'warnings',
  'abc', 'bisect', 'collections', 'contextlib', 'copy', 'dataclasses', 'datetime', 'decimal', 'enum', 'fractions', 'functools', 'heapq', 'io',
  'itertools', 'math', 'operator', 'pathlib', 're', 'statistics', 'string', 'tempfile', 'textwrap', 'typing', 'unicodedata', 'weakref',
];

const host = process;
const send = host.send!.bind(host);

function post(message: SandboxResponse): void {
  send(message);
}

/**
 * The only `process` lesson code can see once Pyodide is loaded: the read-only fields Pyodide uses, no methods that act on the host.
 */
function processAllowList(): object {
  return Object.freeze({
    argv: Object.freeze([]),
    env: Object.freeze({}),
    version: host.version,
    versions: Object.freeze({ ...host.versions }),
    platform: host.platform,
    arch: host.arch,
    release: Object.freeze({ name: host.release.name }),
  });
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Pyodide's NODEFS reads `process.binding("constants")`, which the permission model denies; serve the same constants without the binding.
 */
function shimConstantsBinding(): void {
  const constants = { fs: fsConstants, os: osConstants };
  Object.defineProperty(host, 'binding', {
    configurable: true,
    value: (name: string) => {
      if (name === 'constants') {
        return constants;
      }
      throw new Error(`process.binding("${name}") is not allowed.`);
    },
  });
}

/**
 * Hides what lesson code could use to reach the host once Pyodide is loaded: `process` becomes an allow-list, module loading, NODEFS and network globals go. The permission model is the outer boundary.
 */
function lockDown(pyodide: PyodideAPI): void {
  registerHooks({
    resolve(specifier) {
      throw new Error(`Importing "${specifier}" is not allowed while lesson code runs.`);
    },
  });
  Object.defineProperty(globalThis, 'process', { value: processAllowList(), configurable: false, writable: false, enumerable: false });
  for (const name of NETWORK_GLOBALS) {
    Reflect.deleteProperty(globalThis, name);
  }
  const api = pyodide as unknown as Record<string, unknown> & { FS: { filesystems: Record<string, unknown> }; _module: Record<string, unknown> };
  for (const name of HOST_FILE_SYSTEMS) {
    Reflect.deleteProperty(api.FS.filesystems, name);
    Reflect.deleteProperty(api._module, name);
  }
  Reflect.deleteProperty(api, 'mountNodeFS');
}

/**
 * Boots Pyodide with the standard library modules the harness uses already imported, and returns its memory snapshot.
 */
async function makeSnapshot(): Promise<Uint8Array> {
  shimConstantsBinding();
  const pyodide = await loadPyodide({ indexURL: host.argv[2], env: { ...PYTHON_ENV }, _makeSnapshot: true, stdout: () => undefined, stderr: () => undefined });
  pyodide.runPython(`import ${SNAPSHOT_MODULES.join(', ')}`);
  return pyodide.makeMemorySnapshot();
}

async function start(snapshot: Uint8Array | undefined): Promise<PythonEngine> {
  shimConstantsBinding();
  const globals = Object.fromEntries(JS_GLOBALS.map((name) => [name, (globalThis as Record<string, unknown>)[name]]));
  const pyodide = await loadPyodide({
    indexURL: host.argv[2],
    env: { ...PYTHON_ENV },
    jsglobals: globals,
    stdout: () => undefined,
    stderr: () => undefined,
    ...(snapshot ? { _loadSnapshot: snapshot } : {}),
  });
  const engine = createPythonEngine(pyodide);
  lockDown(pyodide);
  return engine;
}

host.on('disconnect', () => host.exit(0));

let engine: PythonEngine;

host.on('message', async (request: SandboxRequest) => {
  try {
    if (request.type === 'make-snapshot') {
      post({ type: 'snapshot', bytes: await makeSnapshot() });
    }
    if (request.type === 'boot') {
      try {
        engine = await start(request.snapshot);
        post({ type: 'ready' });
      } catch (error) {
        post({ type: 'failed', message: `Python could not start: ${describe(error)}` });
      }
    }
    if (request.type === 'run-tests') {
      const report = await engine.runTests({ ...request, onEvent: (event) => post({ type: 'test-event', event }) });
      post({ type: 'test-report', report });
    }
    if (request.type === 'run') {
      const code = await engine.runProgram(request.files, request.entry, (level, text) => post({ type: 'console', level, text }));
      post({ type: 'run-complete', code });
    }
  } catch (error) {
    post({ type: 'failed', message: `Python stopped unexpectedly: ${describe(error)}` });
  }
});
