import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { appendFileSync, cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import fixtureSolution from '../engines/csharp/fixtures/basic/solution.cs?raw';
import fixtureStarter from '../engines/csharp/fixtures/basic/starter.cs?raw';
import fixtureTests from '../engines/csharp/fixtures/basic/tests.cs?raw';
import jsCallProbe from '../engines/csharp/fixtures/probes/JsCall.cs?raw';
import { listCsharpTestNames } from '../engines/csharp/testNames';
import { bundleCsharpChild, CHILD_HEAP_LIMIT_MB, CHILD_WASM_MEMORY_LIMIT_MB, csharpChildExecArgv, CsharpSandbox, VENDORED_DOTNET_DIRECTORY } from './csharpSandbox';

const LIMIT_MS = 4000;
const PROBE_LIMIT_MS = 30000;
const RESTART_ALLOWANCE_MS = 30000;
const sandbox = new CsharpSandbox({ testTimeoutMs: LIMIT_MS, runTimeoutMs: LIMIT_MS });
const probeSandbox = new CsharpSandbox({ testTimeoutMs: PROBE_LIMIT_MS, runTimeoutMs: PROBE_LIMIT_MS });

const LESSON = `
public static class Lesson
{
    public static int Double(int value) => value * 2;

    public static void Spin()
    {
        while (true) { }
    }

    public static async Task SpinAsync()
    {
        await Task.Yield();
        while (true) { }
    }
}
`;

/**
 * Reflection helpers learner code can write: `System.Runtime.InteropServices.JavaScript` is withheld from the compilation, not from the
 * runtime. The names are built at run time, which the DOJO001 string-literal check cannot see.
 */
const JS_PROBE = `
using System.Reflection;

public static class Js
{
    private const string Interop = "System.Runtime.InteropServices." + "JavaScript";

    public static readonly Type? Host = Type.GetType(Interop + ".JSHost, " + Interop);

    public static object GlobalThis() => Host!.GetProperty("GlobalThis")!.GetValue(null)!;

    private static object? Call(object target, string method, params object[] arguments) =>
        target.GetType().GetMethod(method, arguments.Select(argument => argument.GetType()).ToArray())!.Invoke(target, arguments);

    public static string TypeOf(object target, string name) => (string)Call(target, "GetTypeOfProperty", name)!;

    public static object? Child(object target, string name) => Call(target, "GetPropertyAsJSObject", name);

    public static string? Text(object target, string name) => (string?)Call(target, "GetPropertyAsString", name);

    public static void Set(object target, string name, string value) => Call(target, "SetProperty", name, value);
}
`;

function grade(tests: string, files: Record<string, string> = { 'Lesson.cs': LESSON }) {
  return sandbox.runTests({ files, tests: tests.trim() + '\n' });
}

function outcomes(report: { results: { name: string; passed: boolean }[] }) {
  return report.results.map((result) => [result.name, result.passed]);
}

beforeAll(() => sandbox.start(), 90000);
afterAll(() => {
  sandbox.stop();
  probeSandbox.stop();
});

describe('fixture challenge', () => {
  it('passes every test with the solution', async () => {
    const report = await sandbox.runTests({ files: { 'Scores.cs': fixtureSolution }, tests: fixtureTests });
    expect(report.compileError).toBeUndefined();
    expect(report.results.filter((result) => !result.passed)).toEqual([]);
    expect(report.results.map((result) => result.name)).toEqual(listCsharpTestNames(fixtureTests));
  }, 60000);

  it('fails at least one test with the starter', async () => {
    const report = await sandbox.runTests({ files: { 'Scores.cs': fixtureStarter }, tests: fixtureTests });
    expect(report.compileError).toBeUndefined();
    expect(report.results).toHaveLength(4);
    expect(report.results.some((result) => !result.passed)).toBe(true);
    expect(report.results.find((result) => result.name === 'Total adds the positive scores')?.error).toContain('12');
  }, 60000);

  it('reports a compile error with its position', async () => {
    const report = await sandbox.runTests({ files: { 'Scores.cs': 'public static class Scores { public static int Total(int[] s) => 0 }' }, tests: fixtureTests });
    expect(report.compileError).toMatch(/Scores\.cs\(1,\d+\): error CS\d+/);
    expect(report.results).toEqual([]);
  }, 60000);

  it('runs the program entry point and reports its exit code', async () => {
    const output: string[] = [];
    const code = await sandbox.runProgram({ 'Program.cs': 'Console.WriteLine("hello from C#");\nreturn 3;\n' }, (level, text) => output.push(`${level}:${text}`));
    expect(code).toBe(3);
    expect(output).toEqual(['log:hello from C#', 'error:Process exited with code 3']);
  }, 60000);

  it('compiles /// documentation comments in learner code and in a test file', async () => {
    const documented = '/// <summary>Adds.</summary>\npublic static class A\n{\n    /// <param name="value">A number.</param>\n    public static int B(int value) => value + 1;\n}\n';
    const report = await sandbox.runTests({ files: { 'A.cs': documented }, tests: 'using Dojo;\n/// <summary>Tests.</summary>\npublic static class T { [Test("adds")] public static void Adds() => Assert.Equal(2, A.B(1)); }\n' });
    expect(report.compileError).toBeUndefined();
    expect(outcomes(report)).toEqual([['adds', true]]);
    const output: string[] = [];
    expect(await sandbox.runProgram({ 'Program.cs': 'Console.WriteLine(A.B(1));\n', 'A.cs': documented }, (_, text) => output.push(text))).toBe(0);
    expect(output[0]).toBe('2');
  }, 60000);

  it('stops the console of a run after 1,000,000 characters, in events of at most 8192', async () => {
    const output: string[] = [];
    const code = await sandbox.runProgram({ 'Program.cs': 'for (var line = 0; line < 30; line++) Console.WriteLine(new string(\'x\', 1_000_000));\n' }, (_, text) => output.push(text));
    expect(code).toBe(0);
    expect(Math.max(...output.map((text) => text.length))).toBeLessThanOrEqual(8192);
    expect(output.join('').length).toBeLessThan(1_100_000);
    expect(output).toContain('[output truncated after 1,000,000 characters]');
  }, 60000);
});

describe('per-test wall-clock limit', () => {
  it.each([
    ['sync infinite loop', 'public static void Hangs() => Lesson.Spin();'],
    ['async busy loop', 'public static async Task Hangs() => await Lesson.SpinAsync();'],
  ])('stops a %s, fails only that test and keeps grading', async (_, body) => {
    const report = await grade(`
using Dojo;

public static class LimitTests
{
    [Test("before")]
    public static void Before() => Assert.Equal(4, Lesson.Double(2));

    [Test("hangs")]
    ${body}

    [Test("after")]
    public static async Task After()
    {
        await Task.Delay(1);
        Assert.Equal(6, Lesson.Double(3));
    }
}
`);
    expect(report.compileError).toBeUndefined();
    expect(outcomes(report)).toEqual([
      ['before', true],
      ['hangs', false],
      ['after', true],
    ]);
    expect(report.results[1].error).toContain(`did not finish within ${LIMIT_MS}ms`);
    expect(report.durationMs).toBeLessThan(LIMIT_MS + RESTART_ALLOWANCE_MS);
  }, 60000);

  it('stops a Run demo that never ends, and the next run works', async () => {
    const output: string[] = [];
    const code = await sandbox.runProgram({ 'Program.cs': 'while (true) { }\n' }, (level, text) => output.push(`${level}:${text}`));
    expect(code).toBe(1);
    expect(output.join('\n')).toContain(`did not finish within ${LIMIT_MS}ms`);
    const next: string[] = [];
    expect(await sandbox.runProgram({ 'Program.cs': 'Console.WriteLine("alive");\n' }, (_level, text) => next.push(text))).toBe(0);
    expect(next[0]).toBe('alive');
  }, 60000);
});

describe('runtime integrity (finding C6)', () => {
  let directory: string;

  beforeAll(() => {
    directory = mkdtempSync(join(tmpdir(), 'dojo-dotnet-'));
    cpSync(VENDORED_DOTNET_DIRECTORY, directory, { recursive: true });
  });
  afterAll(() => rmSync(directory, { recursive: true, force: true }));

  it.each([
    ['an assembly', 'assemblies/System.Linq.wasm'],
    ['a reference assembly', 'ref/System.Runtime.wasm'],
    ['a runtime module', 'dotnet.runtime.js'],
  ])('refuses to start when %s does not match its pin, even with a matching served manifest', async (_, path) => {
    const tampered = new CsharpSandbox({ dotnetDirectory: directory, prewarm: 0 });
    const original = readFileSync(join(directory, path));
    const manifestPath = join(directory, 'manifest.json');
    const manifest = readFileSync(manifestPath, 'utf8');
    try {
      appendFileSync(join(directory, path), '\n// tampered\n');
      const { createHash } = await import('node:crypto');
      const forged = JSON.parse(manifest) as { files: { path: string; sha256: string; bytes: number }[] };
      const entry = forged.files.find((file) => file.path === path)!;
      const bytes = readFileSync(join(directory, path));
      entry.sha256 = createHash('sha256').update(bytes).digest('hex');
      entry.bytes = bytes.byteLength;
      writeFileSync(manifestPath, JSON.stringify(forged));
      const report = await tampered.runTests({ files: { 'Scores.cs': fixtureSolution }, tests: fixtureTests });
      expect(report.results).toEqual([]);
      expect(report.compileError).toContain(`dotnet/${path} does not match its pinned SHA-256`);
    } finally {
      tampered.stop();
      writeFileSync(join(directory, path), original);
      writeFileSync(manifestPath, manifest);
    }
  }, 60000);
});

describe('lock-down probes from C# (findings C1, C2)', () => {
  it('cannot compile HttpClient or load it by name', async () => {
    const compiled = await grade('using Dojo;\npublic static class T { [Test("http")] public static void Http() => new System.Net.Http.HttpClient(); }');
    expect(compiled.compileError).toMatch(/error CS0234/);
    const loaded = await grade(`
using Dojo;
public static class T
{
    [Test("HttpClient is not shipped")]
    public static void NotShipped()
    {
        Assert.Null(Type.GetType("System.Net.Http.HttpClient, System.Net.Http"));
        Assert.Null(Type.GetType("System.Net.WebSockets.ClientWebSocket, System.Net.WebSockets.Client"));
    }
}`);
    expect(outcomes(loaded)).toEqual([['HttpClient is not shipped', true]]);
  }, 60000);

  it('refuses string literals that name Reflection.Emit or the JavaScript interop (DOJO001)', async () => {
    const report = await grade('using Dojo;\npublic static class T { [Test("emit")] public static void Emit() => Assert.NotNull(Type.GetType("System.Reflection.Emit.DynamicMethod")); }');
    expect(report.compileError).toMatch(/tests\.cs\(2,\d+\): error DOJO001: System\.Reflection\.Emit is not available/);
    const program = await sandbox.runProgram({ 'Program.cs': 'Console.WriteLine($"{Type.GetType("System.Runtime.InteropServices.JavaScript.JSHost")}");' }, () => undefined);
    expect(program).toBe(1);
  }, 60000);

  it('fails every JavaScript binding after the lock-down: JSHost.GlobalThis, JSHost.ImportAsync and the host module', async () => {
    const report = await grade(
      `
using Dojo;
using System.Reflection;
using System.Threading;

public static class Probes
{
    [Test("JSHost is in the runtime")]
    public static void Reachable() => Assert.NotNull(Js.Host);

    [Test("JSHost.GlobalThis cannot bind its import")]
    public static void NoGlobalThis()
    {
        var error = Assert.Throws<TargetInvocationException>(() => Js.GlobalThis());
        Assert.Contains("Binding JavaScript functions is disabled", error.InnerException!.ToString());
    }

    [Test("JSHost.ImportAsync cannot load a module")]
    public static async Task NoImport()
    {
        var import = Js.Host!.GetMethods().First(method => method.Name == "ImportAsync");
        var arguments = import.GetParameters().Length == 3
            ? new object?[] { "probe", "data:text/javascript,export const leaked = 1", CancellationToken.None }
            : new object?[] { "probe", "data:text/javascript,export const leaked = 1" };
        Exception? error = null;
        try
        {
            await (Task)import.Invoke(null, arguments)!;
        }
        catch (Exception exception)
        {
            error = exception;
        }
        Assert.NotNull(error);
    }
}`,
      { 'Lesson.cs': LESSON, 'Js.cs': `using System.Reflection;\n${JS_PROBE}` },
    );
    expect(report.compileError).toBeUndefined();
    expect(report.results.filter((result) => !result.passed)).toEqual([]);
    expect(report.results).toHaveLength(3);
  }, 60000);

  it('cannot bind or call a JavaScript function through JSFunctionBinding with a DynamicMethod', async () => {
    const output: string[] = [];
    const program = `
foreach (var (path, module) in new (string, string?)[] { ("globalThis.setTimeout", null), ("globalThis.JSON.parse", null), ("INTERNAL.mono_wasm_exit", null), ("emit", "dojo-host") })
{
    try
    {
        JsCall.Call(path, module, false, "{}");
        Console.WriteLine($"called {path}");
    }
    catch (Exception exception)
    {
        var inner = exception;
        while (inner.InnerException is not null) inner = inner.InnerException;
        Console.WriteLine($"blocked {path}: {inner.Message}");
    }
}
`;
    const exitCode = await probeSandbox.runProgram({ 'Program.cs': program, 'JsCall.cs': jsCallProbe }, (_, text) => output.push(text));
    expect(exitCode).toBe(0);
    const lines = output.filter((line) => line.startsWith('called') || line.startsWith('blocked'));
    expect(lines).toHaveLength(4);
    for (const line of lines) {
      expect(line).toMatch(/^blocked .*Binding JavaScript functions is disabled in the C# sandbox/);
    }
  }, 60000);
});

describe('escape scan (finding C3)', () => {
  it('finds no original code generator, network API, loader or Node host object reachable from globalThis or INTERNAL', async () => {
    const marker = `dojoEscapeScan${Date.now()}`;
    const program = `try { Js.Set(Js.GlobalThis(), "${marker}", "${marker}"); } catch (Exception) { Console.WriteLine("blocked"); }\n`;
    const result = await sandbox.escapeScan({ 'Js.cs': JS_PROBE, 'Program.cs': program }, marker);
    expect(result.exitCode).toBe(0);
    expect(result.marked).toBe(false);
    expect(result.findings).toEqual([]);
    expect(result.visited).toBeGreaterThan(1000);
  }, 90000);
});

describe('fresh runtime per run (findings C4, C5)', () => {
  it('does not keep /tmp files or static state from one test run to the next', async () => {
    const lesson = { 'Lesson.cs': 'public static class Counter { public static int Count; }' };
    const tests = `
using Dojo;
public static class T
{
    [Test("starts clean")]
    public static void Clean()
    {
        Assert.False(File.Exists("/tmp/dojo-probe.txt"));
        Assert.Equal(0, Counter.Count);
        Assert.Null(AppContext.GetData("dojo.probe"));
        File.WriteAllText("/tmp/dojo-probe.txt", "left behind");
        Counter.Count = 1;
        AppContext.SetData("dojo.probe", "left behind");
    }
}`;
    expect(outcomes(await grade(`using System.IO;\n${tests}`, lesson))).toEqual([['starts clean', true]]);
    expect(outcomes(await grade(`using System.IO;\n${tests}`, lesson))).toEqual([['starts clean', true]]);
  }, 60000);
});

describe('process allow-list', () => {
  it('starts children under the permission model with read access to the runtime and the child script only, and memory caps', async () => {
    const script = await bundleCsharpChild();
    expect(csharpChildExecArgv(script, '/runtime')).toEqual([
      '--permission',
      '--allow-fs-read=/runtime/',
      `--allow-fs-read=${script}`,
      '--disable-sigusr1',
      `--max-old-space-size=${CHILD_HEAP_LIMIT_MB}`,
      `--wasm-max-mem-pages=${(CHILD_WASM_MEMORY_LIMIT_MB * 1024 * 1024) / (64 * 1024)}`,
    ]);
  });

  it('cannot read files outside the runtime folder or reach the host environment', async () => {
    process.env.DOJO_SANDBOX_PROBE = 'host-secret';
    try {
      const report = await grade(`
using Dojo;
using System.IO;
public static class T
{
    [Test("no host environment")]
    public static void NoEnvironment() => Assert.Null(Environment.GetEnvironmentVariable("DOJO_SANDBOX_PROBE"));

    [Test("no host files")]
    public static void NoHostFiles() => Assert.False(File.Exists("/etc/passwd"));
}`);
      expect(report.results.filter((result) => !result.passed)).toEqual([]);
      expect(report.results).toHaveLength(2);
    } finally {
      delete process.env.DOJO_SANDBOX_PROBE;
    }
  }, 60000);
});
