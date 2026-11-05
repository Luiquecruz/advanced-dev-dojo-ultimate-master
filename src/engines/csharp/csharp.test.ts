import { describe, expect, it } from 'vitest';
import { NETWORK_GLOBALS } from '../shared/workerLockdown';
import { bootFiles, checkDotnetFile, dotnetConfig, REFERENCE_DIRECTORY, REFERENCE_SECTION, unwrapReference, type DotnetFile, type DotnetManifest } from './engine';
import fixtureTests from './fixtures/basic/tests.cs?raw';
import { blockFunctionBinding, DOTNET_INTERNAL_MEMBERS, DOTNET_RUNTIME_GLOBALS, DOTNET_WORKER_GLOBALS, lockDownCsharp, lockDownDotnetInternals } from './lockdown';
import { parseHostEvent, parseProgramReport, parseTestReport, reportMismatch } from './protocol';
import { listCsharpTestNames } from './testNames';

describe('listCsharpTestNames', () => {
  it('reads the fixture names in source order', () => {
    expect(listCsharpTestNames(fixtureTests)).toEqual([
      'Total adds the positive scores',
      'Total of no scores is 0',
      'Grade maps score bands to letters',
      'Grade works after an await',
    ]);
  });

  it('accepts the attribute spellings, escapes and verbatim strings', () => {
    const tests = [
      '[Test("plain")] public static void A() {}',
      '[TestAttribute("long name")] public static void B() {}',
      '[Dojo.Test("qualified")] public static void C() {}',
      '[Obsolete, Test("second in the list")] public static void D() {}',
      '[Test("says \\"hi\\"\\tthen \\u00e9")] public static void E() {}',
      '[Test(@"verbatim ""quote"" C:\\path")] public static void F() {}',
    ].join('\n');
    expect(listCsharpTestNames(tests)).toEqual(['plain', 'long name', 'qualified', 'second in the list', 'says "hi"\tthen é', 'verbatim "quote" C:\\path']);
  });

  it('skips commented-out tests but not tests after a string that looks like a comment', () => {
    const tests = [
      '// [Test("line comment")]',
      '/* [Test("block comment")] */',
      'const string Url = "http://example.com/*";',
      '[Test("after the string")] public static void A() {}',
      '/*',
      '[Test("inside a multi-line comment")]',
      '*/',
    ].join('\n');
    expect(listCsharpTestNames(tests)).toEqual(['after the string']);
  });
});

describe('C# host protocol', () => {
  it('reads start, result and console events', () => {
    expect(parseHostEvent('{"type":"start","index":0,"total":2,"name":"adds"}')).toEqual({ type: 'start', index: 0, total: 2, name: 'adds' });
    expect(parseHostEvent('{"type":"result","index":1,"result":{"name":"subs","passed":false,"error":"expected 1, got 5"}}')).toEqual({
      type: 'result',
      index: 1,
      result: { name: 'subs', passed: false, error: 'expected 1, got 5' },
    });
    expect(parseHostEvent('{"type":"console","level":"error","text":"boom\\n"}')).toEqual({ type: 'console', level: 'error', text: 'boom\n' });
  });

  it('rejects unknown or malformed events', () => {
    expect(() => parseHostEvent('{"type":"exit"}')).toThrow(/unknown event/);
    expect(() => parseHostEvent('{"type":"start","index":"0","total":1,"name":"adds"}')).toThrow(/malformed/);
    expect(() => parseHostEvent('{"type":"start","index":0,"name":"adds"}')).toThrow(/malformed/);
    expect(() => parseHostEvent('[]')).toThrow(/malformed/);
  });

  it('reads a test report with diagnostics and keeps the caller duration', () => {
    const payload = JSON.stringify({
      diagnostics: [{ file: 'Program.cs', line: 3, column: 9, endLine: 3, endColumn: 10, severity: 'error', code: 'CS1002', message: '; expected' }],
      compileError: 'Program.cs(3,9): error CS1002: ; expected',
      results: [],
      durationMs: 80,
    });
    expect(parseTestReport(payload, 95)).toEqual({
      results: [],
      compileError: 'Program.cs(3,9): error CS1002: ; expected',
      diagnostics: [{ file: 'Program.cs', line: 3, column: 9, endLine: 3, endColumn: 10, severity: 'error', code: 'CS1002', message: '; expected' }],
      durationMs: 95,
    });
    expect(parseTestReport('{"diagnostics":[],"results":[{"name":"a","passed":true}],"durationMs":12}')).toEqual({
      results: [{ name: 'a', passed: true }],
      diagnostics: [],
      durationMs: 12,
    });
  });

  it('reads a diagnostic without a source location', () => {
    const report = parseTestReport('{"diagnostics":[{"file":null,"line":1,"column":1,"endLine":1,"endColumn":1,"severity":"error","code":"CS1569","message":"x"}],"results":[],"durationMs":1}');
    expect(report.diagnostics[0].file).toBe('');
  });

  it('accepts only a report that matches the result events and the listed test names', () => {
    const results = [{ name: 'a', passed: true }, { name: 'b', passed: false, error: 'no' }];
    const report = { results, durationMs: 1 };
    expect(reportMismatch(report, results, ['a', 'b'], 0)).toBeUndefined();
    expect(reportMismatch({ results: results.slice(1), durationMs: 1 }, results.slice(1), ['a', 'b'], 1)).toBeUndefined();
    expect(reportMismatch({ results: [{ name: 'a', passed: true }], durationMs: 1 }, results, ['a', 'b'], 0)).toMatch(/does not match the tests that ran/);
    expect(reportMismatch({ results: [{ name: 'a', passed: true }], durationMs: 1 }, [{ name: 'a', passed: true }], ['a', 'b'], 0)).toMatch(/does not list the tests/);
    expect(reportMismatch({ results: [{ name: 'a', passed: true }, { name: 'b', passed: true }], durationMs: 1 }, results, ['a', 'b'], 0)).toMatch(/does not match/);
    expect(reportMismatch({ results: [], compileError: 'CS1002', durationMs: 1 }, [], ['a', 'b'], 0)).toBeUndefined();
  });

  it('reads a program report', () => {
    expect(parseProgramReport('{"diagnostics":[],"exitCode":3}')).toEqual({ exitCode: 3, diagnostics: [] });
    expect(parseProgramReport('{"diagnostics":[],"error":"no entry point","exitCode":1}')).toEqual({ exitCode: 1, diagnostics: [], error: 'no entry point' });
    expect(() => parseProgramReport('{"diagnostics":[]}')).toThrow(/malformed/);
  });
});

/** A reference assembly as vendor-dotnet.mjs serves it: a WebAssembly module with one custom section that holds the PE bytes. */
function wrapped(payload: Uint8Array, name = REFERENCE_SECTION): ArrayBuffer {
  const leb = (value: number) => {
    const bytes: number[] = [];
    let rest = value;
    do {
      const byte = rest & 0x7f;
      rest = Math.floor(rest / 128);
      bytes.push(rest > 0 ? byte | 0x80 : byte);
    } while (rest > 0);
    return bytes;
  };
  const nameBytes = [...new TextEncoder().encode(name)];
  const content = [...leb(nameBytes.length), ...nameBytes, ...payload];
  return new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, 0x00, ...leb(content.length), ...content]).buffer;
}

describe('C# runtime boot', () => {
  const file = (path: string, role: DotnetFile['role'], bytes = 0): DotnetFile => ({ path, role, sha256: '', bytes });
  const manifest: DotnetManifest = {
    dotnet: '10.0.14',
    roslyn: '5.9.0',
    files: [
      file('assemblies/DojoHost.wasm', 'host', 30),
      file('assemblies/Microsoft.CodeAnalysis.CSharp.wasm', 'assembly', 7000),
      file('assemblies/System.Linq.wasm', 'assembly', 200),
      file('dotnet.js', 'runtime', 40),
      file('dotnet.native.wasm', 'runtime', 3000),
      file('dotnet.runtime.js', 'runtime', 200),
      file('licenses/dotnet-LICENSE.TXT', 'license', 1),
      file('ref/System.Runtime.wasm', 'reference', 800),
      file('System.Private.CoreLib.wasm', 'core', 4600),
    ],
  };

  it('downloads the runtime JavaScript first, then the largest file first, and never the licenses', () => {
    expect(bootFiles(manifest).map((entry) => entry.path)).toEqual([
      'dotnet.runtime.js',
      'dotnet.js',
      'assemblies/Microsoft.CodeAnalysis.CSharp.wasm',
      'System.Private.CoreLib.wasm',
      'dotnet.native.wasm',
      'ref/System.Runtime.wasm',
      'assemblies/System.Linq.wasm',
      'assemblies/DojoHost.wasm',
    ]);
  });

  it('hands every asset over as a pending download, Webcil assemblies as core ones and references unwrapped under /ref', async () => {
    const pe = new Uint8Array([0x4d, 0x5a, 1, 2, 3]);
    const assets = bootFiles(manifest).map((entry) => ({ file: entry, bytes: Promise.resolve(entry.role === 'reference' ? wrapped(pe) : new ArrayBuffer(1)) }));
    type Asset = { name: string; virtualPath?: string; resolvedUrl?: string; pendingDownload: { response: Promise<Response> } };
    const config = dotnetConfig(assets, { native: {}, runtime: {} }) as { resources: Record<string, Asset[]> };
    expect(config.resources.coreAssembly.map((asset) => asset.virtualPath)).toEqual(['Microsoft.CodeAnalysis.CSharp.wasm', 'System.Private.CoreLib.wasm', 'System.Linq.wasm', 'DojoHost.wasm']);
    expect(config.resources.assembly).toBeUndefined();
    expect(config.resources.vfs).toEqual([expect.objectContaining({ name: 'System.Runtime.dll', virtualPath: `${REFERENCE_DIRECTORY}/System.Runtime.dll` })]);
    expect(new Uint8Array(await (await config.resources.vfs[0].pendingDownload.response).arrayBuffer())).toEqual(pe);
    const [wasm] = config.resources.wasmNative;
    expect(wasm.name).toBe('dotnet.native.wasm');
    expect((await wasm.pendingDownload.response).headers.get('Content-Type')).toBe('application/wasm');
    for (const asset of Object.values(config.resources).flat().filter((entry) => 'pendingDownload' in entry)) {
      expect(asset.resolvedUrl, asset.name).toBeTypeOf('string');
    }
  });

  it('starts nothing from a file that failed its check: the pending download rejects', async () => {
    const assets = bootFiles(manifest).map((entry) => ({ file: entry, bytes: entry.path.endsWith('System.Linq.wasm') ? Promise.reject(new Error('tampered')) : Promise.resolve(entry.role === 'reference' ? wrapped(new Uint8Array([1])) : new ArrayBuffer(1)) }));
    const config = dotnetConfig(assets, { native: {}, runtime: {} }) as { resources: { coreAssembly: { name: string; pendingDownload: { response: Promise<Response> } }[] } };
    const linq = config.resources.coreAssembly.find((asset) => asset.name === 'System.Linq.wasm')!;
    await expect(linq.pendingDownload.response).rejects.toThrow('tampered');
  });

  it('unwraps a reference assembly only from a module with exactly one dojo.pe section', () => {
    const pe = new Uint8Array(300).map((_, index) => index % 251);
    expect(new Uint8Array(unwrapReference(wrapped(pe)))).toEqual(pe);
    expect(() => unwrapReference(wrapped(pe, 'other'))).toThrow(/dojo\.pe/);
    expect(() => unwrapReference(pe.buffer)).toThrow(/not a WebAssembly module/);
    const trailing = new Uint8Array([...new Uint8Array(wrapped(pe)), 0x00, 0x01, 0x00]);
    expect(() => unwrapReference(trailing.buffer)).toThrow(/exactly one/);
  });

  it('accepts a file only with its pinned size and SHA-256', async () => {
    const bytes = new TextEncoder().encode('abc');
    const pinned: DotnetFile = { path: 'x.dll', role: 'assembly', bytes: 3, sha256: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad' };
    await expect(checkDotnetFile(pinned, bytes.buffer)).resolves.toBeUndefined();
    await expect(checkDotnetFile(pinned, new TextEncoder().encode('abd').buffer)).rejects.toThrow(/does not match/);
    await expect(checkDotnetFile(pinned, new TextEncoder().encode('abcd').buffer)).rejects.toThrow(/4 bytes/);
  });
});

describe('lockDownDotnetInternals', () => {
  it('removes the loaders, the Node host and the HTTP and WebSocket bindings from INTERNAL and keeps the property bindings', () => {
    const internal: Record<string, unknown> = {};
    const removed = [...DOTNET_INTERNAL_MEMBERS, 'http_wasm_fetch', 'http_wasm_fetch_bytes', 'ws_wasm_create', 'ws_get_state'];
    const kept = ['get_property', 'set_property', 'get_global_this', 'mono_wasm_exit'];
    for (const name of [...removed, ...kept]) {
      internal[name] = () => undefined;
    }
    lockDownDotnetInternals(internal);
    for (const name of removed) {
      expect(internal[name], name).toBeUndefined();
    }
    for (const name of kept) {
      expect(internal[name], name).toBeTypeOf('function');
    }
  });
});

describe('blockFunctionBinding', () => {
  it('makes bind throw on the given prototype and keeps call and apply', () => {
    const prototype = { bind: () => undefined, call: () => 'call' };
    blockFunctionBinding(prototype);
    expect(() => prototype.bind()).toThrow(/Binding JavaScript functions is disabled/);
    expect(prototype.call()).toBe('call');
    expect(() => Object.assign(prototype, { bind: () => undefined })).toThrow(TypeError);
  });
});

describe('lockDownCsharp', () => {
  it('removes network, runtime and worker globals, blocks code generation and blocks bind', () => {
    const scope: Record<string, unknown> = { Function, setTimeout };
    const all = [...NETWORK_GLOBALS, ...DOTNET_RUNTIME_GLOBALS, ...DOTNET_WORKER_GLOBALS];
    for (const name of all) {
      scope[name] = () => undefined;
    }
    const functionPrototype = { bind: () => undefined };
    // The function constructors are replaced on this realm's intrinsics for good, so this test runs last in its file.
    lockDownCsharp(scope, undefined, functionPrototype);
    for (const name of all) {
      expect(scope[name], name).toBeUndefined();
    }
    for (const name of ['postMessage', 'navigator', 'dotnetSidecar', 'OffscreenCanvas']) {
      expect(all, name).toContain(name);
    }
    expect(() => functionPrototype.bind()).toThrow(TypeError);
    expect(() => (scope.Function as FunctionConstructor)('return 1')).toThrow(EvalError);
    expect(() => (scope.eval as (code: string) => unknown)('1')).toThrow(EvalError);
    expect(() => new (Object.getPrototypeOf(async function () {}).constructor as FunctionConstructor)('return 1')).toThrow(EvalError);
    expect(function () {} instanceof (scope.Function as FunctionConstructor)).toBe(true);
  });
});
