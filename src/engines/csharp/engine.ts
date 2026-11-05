import type { ProjectFiles } from '../shared/project';
import {
  parseHostEvent,
  parseProgramReport,
  parseTestReport,
  type CsharpHostEvent,
  type CsharpReport,
  type CsharpTestEvent,
  type OutputLevel,
} from './protocol';

/** Name the tests file is compiled under, so its diagnostics point at `tests.cs`. */
export const TESTS_FILE_NAME = 'tests.cs';

/** Assembly with the `[JSExport]` methods (src/engines/csharp/host/DojoHost.cs). */
export const HOST_ASSEMBLY = 'DojoHost';

/** Module name the host's `[JSImport("emit", "dojo-host")]` resolves to. */
export const HOST_MODULE = 'dojo-host';

/** Folder of the reference assemblies in the runtime's file system; `DojoHost.ReferenceDirectory`. */
export const REFERENCE_DIRECTORY = '/ref';

const SCRATCH_DIRECTORY = '/tmp';

const WARM_FILE_NAME = 'Warm.cs';
const WARM_SOURCE = 'public static class Warm { public static int Sum(IEnumerable<int> items) => items.Where(item => item > 0).Sum(); }';
const WARM_TESTS = 'using Dojo;\npublic static class WarmTests { [Test("warm")] public static async Task Sums() { await Task.Yield(); Assert.Equal(3, Warm.Sum([1, 2, -4])); } }';

export interface DotnetFile {
  path: string;
  role: 'runtime' | 'core' | 'assembly' | 'host' | 'reference' | 'license';
  sha256: string;
  bytes: number;
}

/** The part of `vendor/dotnet/manifest.json` the engine reads. */
export interface DotnetManifest {
  dotnet: string;
  roslyn: string;
  files: DotnetFile[];
}

/** A manifest file with its bytes, already checked. */
export interface LoadedDotnetFile {
  file: DotnetFile;
  buffer: ArrayBuffer;
}

/** The JavaScript modules of the runtime, imported by the caller (a worker or Node) from the checked URLs. */
export interface DotnetModules {
  native: unknown;
  runtime: unknown;
}

interface EmscriptenFileSystem {
  readdir(path: string): string[];
  stat(path: string): { mode: number };
  isDir(mode: number): boolean;
  unlink(path: string): void;
  rmdir(path: string): void;
  mkdir(path: string): void;
  cwd(): string;
  chdir(path: string): void;
}

/** The subset of the .NET `RuntimeAPI` (`dotnet.d.ts` in the runtime pack) the engine uses. */
export interface DotnetRuntime {
  setModuleImports(moduleName: string, moduleImports: Record<string, unknown>): void;
  getAssemblyExports(assemblyName: string): Promise<unknown>;
  Module: { FS: EmscriptenFileSystem };
  /** Runtime internals that C# reaches by name (`JSFunctionBinding`, "INTERNAL.<path>"); trimmed by `lockDownCsharp`. */
  INTERNAL?: Record<string, unknown>;
}

/** `DojoHost`'s `[JSExport]` methods as the runtime exposes them. */
interface HostExports {
  RunTests(fileNames: string[], fileSources: string[], testsName: string, tests: string, startAt: number): Promise<string>;
  RunProgram(fileNames: string[], fileSources: string[]): Promise<string>;
  Warm(): void;
}

export interface CsharpTestRequest {
  files: ProjectFiles;
  tests: string;
  /** Index of the first test to run; earlier tests are skipped (used to resume after a stopped test). */
  startAt?: number;
  onEvent?: (event: CsharpTestEvent) => void;
}

export interface CsharpEngine {
  /** Compiles and runs a throwaway test project so Roslyn and the harness are warm before the first learner run (≈ 0.6–1.5 s). */
  warm(): Promise<void>;
  runTests(request: CsharpTestRequest): Promise<CsharpReport>;
  /** Runs the program's entry point, streams its console and resolves to the exit code. */
  runProgram(files: ProjectFiles, onOutput: (level: OutputLevel, text: string) => void): Promise<number>;
}

/**
 * The manifest files the runtime boots from (everything except licenses).
 */
export function bootFiles(manifest: DotnetManifest): DotnetFile[] {
  return manifest.files.filter((file) => file.role !== 'license');
}

function hex(digest: ArrayBuffer): string {
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Fails unless `buffer` has the size and SHA-256 the manifest pins for `file` (spike finding C6), before it reaches the runtime.
 */
export async function checkDotnetFile(file: DotnetFile, buffer: ArrayBuffer): Promise<void> {
  const actual = buffer.byteLength === file.bytes ? hex(await crypto.subtle.digest('SHA-256', buffer)) : `${buffer.byteLength} bytes`;
  if (actual !== file.sha256) {
    throw new Error(`dotnet/${file.path} does not match its pinned SHA-256 (got ${actual}); the C# runtime was not started.`);
  }
}

function fileName(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

/**
 * The `MonoConfig` for `dotnet.withConfig`: every asset is passed as a checked buffer (the default loader cannot find the bindings
 * assembly in a worker, spike §2), the wasm as an in-memory `application/wasm` response so it still compiles with
 * `instantiateStreaming`, every assembly as a core one (the runtime starts only once core assets are in memory, and the JavaScript
 * bindings assembly must be loaded by then; as a plain `assembly` it can still be pending, which fails the boot), the reference assemblies are mounted at `/ref`, globalization is invariant (no ICU shipped) and
 * `debugLevel: 0` turns on the interpreter optimizations.
 */
export function dotnetConfig(loaded: LoadedDotnetFile[], modules: DotnetModules): Record<string, unknown> {
  const withRole = (...roles: DotnetFile['role'][]) => loaded.filter(({ file }) => roles.includes(file.role));
  const wasm = withRole('runtime').find(({ file }) => file.path.endsWith('.wasm'));
  if (!wasm) {
    throw new Error('The .NET manifest lists no dotnet.native.wasm.');
  }
  const wasmName = fileName(wasm.file.path);
  const assembly = ({ file, buffer }: LoadedDotnetFile) => ({ name: fileName(file.path), virtualPath: fileName(file.path), buffer });
  return {
    mainAssemblyName: HOST_ASSEMBLY,
    globalizationMode: 'invariant',
    debugLevel: 0,
    resources: {
      jsModuleNative: [{ name: 'dotnet.native.js', moduleExports: modules.native }],
      jsModuleRuntime: [{ name: 'dotnet.runtime.js', moduleExports: modules.runtime }],
      wasmNative: [{ name: wasmName, pendingDownload: { name: wasmName, url: wasmName, response: Promise.resolve(new Response(wasm.buffer, { headers: { 'Content-Type': 'application/wasm' } })) } }],
      coreAssembly: withRole('core', 'assembly', 'host').map(assembly),
      vfs: withRole('reference').map(({ file, buffer }) => ({ name: fileName(file.path), virtualPath: `${REFERENCE_DIRECTORY}/${fileName(file.path)}`, buffer })),
    },
  };
}

function hostExports(exports: unknown): HostExports {
  const host = (exports as { Dojo?: { Host?: { DojoHost?: Partial<HostExports> } } }).Dojo?.Host?.DojoHost;
  if (typeof host?.RunTests !== 'function' || typeof host.RunProgram !== 'function' || typeof host.Warm !== 'function') {
    throw new Error('DojoHost.dll does not export RunTests, RunProgram and Warm.');
  }
  return host as HostExports;
}

function removeTree(fs: EmscriptenFileSystem, path: string): void {
  if (fs.isDir(fs.stat(path).mode)) {
    for (const entry of fs.readdir(path)) {
      if (entry !== '.' && entry !== '..') {
        removeTree(fs, `${path}/${entry}`);
      }
    }
    fs.rmdir(path);
    return;
  }
  fs.unlink(path);
}

/**
 * Empties `/tmp` and restores the working directory, so files and `Directory.SetCurrentDirectory` from one run never reach the next
 * one in the same runtime (spike finding C4). The browser uses a fresh worker per run anyway; verification may reuse a runtime.
 */
function resetScratch(fs: EmscriptenFileSystem, workingDirectory: string): void {
  try {
    for (const entry of fs.readdir(SCRATCH_DIRECTORY)) {
      if (entry !== '.' && entry !== '..') {
        removeTree(fs, `${SCRATCH_DIRECTORY}/${entry}`);
      }
    }
  } catch {
    fs.mkdir(SCRATCH_DIRECTORY);
  }
  fs.chdir(workingDirectory);
}

function sources(files: ProjectFiles): [string[], string[]] {
  const names = Object.keys(files).filter((name) => name.endsWith('.cs')).sort();
  return [names, names.map((name) => files[name])];
}

/**
 * Prepares a booted .NET runtime to grade and run learner C#: registers the host's event import and binds its exports. The same
 * function serves the browser worker and Node verification. Call `warm()` before the first run, then lock the scope down.
 */
export async function createCsharpEngine(runtime: DotnetRuntime): Promise<CsharpEngine> {
  let listener: (event: CsharpHostEvent) => void = () => undefined;
  runtime.setModuleImports(HOST_MODULE, { emit: (payload: string) => listener(parseHostEvent(payload)) });
  const host = hostExports(await runtime.getAssemblyExports(HOST_ASSEMBLY));
  const { FS: fs } = runtime.Module;
  const workingDirectory = fs.cwd();

  return {
    async warm() {
      host.Warm();
      await host.RunTests([WARM_FILE_NAME], [WARM_SOURCE], TESTS_FILE_NAME, WARM_TESTS, 0);
      resetScratch(fs, workingDirectory);
    },
    async runTests({ files, tests, startAt = 0, onEvent }) {
      const startedAt = performance.now();
      resetScratch(fs, workingDirectory);
      listener = (event) => {
        if (event.type !== 'console') {
          onEvent?.(event);
        }
      };
      try {
        const [names, contents] = sources(files);
        const payload = await host.RunTests(names, contents, TESTS_FILE_NAME, tests, startAt);
        return parseTestReport(payload, Math.round(performance.now() - startedAt));
      } finally {
        listener = () => undefined;
      }
    },
    async runProgram(files, onOutput) {
      resetScratch(fs, workingDirectory);
      listener = (event) => {
        if (event.type === 'console') {
          onOutput(event.level, event.text.replace(/\n$/, ''));
        }
      };
      try {
        const [names, contents] = sources(files);
        const report = parseProgramReport(await host.RunProgram(names, contents));
        if (report.compileError !== undefined) {
          onOutput('error', report.compileError);
        }
        if (report.error !== undefined) {
          onOutput('error', report.error);
        }
        onOutput(report.exitCode === 0 ? 'log' : 'error', `Process exited with code ${report.exitCode}`);
        return report.exitCode;
      } finally {
        listener = () => undefined;
      }
    },
  };
}
