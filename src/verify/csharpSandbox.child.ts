import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { files as manifestFiles } from '../../vendor/dotnet/manifest.json';
import { bootFiles, checkDotnetFile, createCsharpEngine, dotnetConfig, type CsharpEngine, type DotnetFile, type DotnetRuntime, type LoadedDotnetFile } from '../engines/csharp/engine';
import { lockDownCsharp, refuseCsharpStringTimers } from '../engines/csharp/lockdown';
import { dangerousOriginals, scanReachable } from './csharpEscapeScan';
import type { CsharpSandboxRequest, CsharpSandboxResponse } from './csharpSandbox';
import { processAllowList } from './pythonSandboxProcess';

interface DotnetHostBuilder {
  withConfig(config: Record<string, unknown>): DotnetHostBuilder;
  create(): Promise<DotnetRuntime>;
}

const JS_MODULES = ['dotnet.js', 'dotnet.native.js', 'dotnet.runtime.js'] as const;

const host = process;
const send = host.send!.bind(host);
const directory = host.argv[2];
const scope = globalThis as unknown as Record<string, unknown>;

let engine: CsharpEngine | undefined;
let internal: Record<string, unknown> | undefined;
let originals: Map<unknown, string> | undefined;

function post(message: CsharpSandboxResponse): void {
  send(message);
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Reads one runtime file and checks it against the SHA-256 pinned in the manifest bundled into this script (spike finding C6), the
 * same check the browser worker runs, so a tampered `vendor/dotnet/` folder cannot bring its own manifest.
 */
async function load(file: DotnetFile): Promise<LoadedDotnetFile> {
  const bytes = readFileSync(join(directory, file.path));
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  await checkDotnetFile(file, buffer);
  return { file, buffer };
}

/**
 * Hides what learner C# could use to reach the host once the runtime is up: `process` becomes an allow-list, module loading (which
 * also serves `JSHost.ImportAsync`) throws, and the worker lock-down removes network globals, the runtime's globals and internals
 * and code generation. The permission model is the outer boundary.
 */
function lockDown(runtime: DotnetRuntime): void {
  originals = dangerousOriginals(scope, runtime.INTERNAL ?? {});
  registerHooks({
    resolve(specifier) {
      throw new Error(`Importing "${specifier}" is not allowed while lesson code runs.`);
    },
  });
  Object.defineProperty(globalThis, 'process', { value: processAllowList(host), configurable: false, writable: false, enumerable: false });
  lockDownCsharp(scope, runtime.INTERNAL);
  internal = runtime.INTERNAL;
}

async function boot(): Promise<void> {
  refuseCsharpStringTimers(scope);
  const loaded = await Promise.all(bootFiles({ dotnet: '', roslyn: '', files: manifestFiles as DotnetFile[] }).map(load));
  const [loader, native, runtimeModule] = await Promise.all(
    JS_MODULES.map((name) => import(/* @vite-ignore */ pathToFileURL(join(directory, name)).href) as Promise<Record<string, unknown>>),
  );
  const dotnet = loader.dotnet as DotnetHostBuilder;
  const runtime = await dotnet.withConfig(dotnetConfig(loaded, { native, runtime: runtimeModule })).create();
  const csharp = await createCsharpEngine(runtime);
  await csharp.warm();
  lockDown(runtime);
  engine = csharp;
}

host.on('disconnect', () => host.exit(0));

host.on('message', async (request: CsharpSandboxRequest) => {
  try {
    if (request.type === 'boot') {
      try {
        await boot();
        post({ type: 'ready' });
      } catch (error) {
        post({ type: 'failed', message: `C# could not start: ${describe(error)}` });
      }
      return;
    }
    if (!engine) {
      post({ type: 'failed', message: 'C# has not started.' });
      return;
    }
    if (request.type === 'run-tests') {
      const report = await engine.runTests({ ...request, onEvent: (event) => post({ type: 'test-event', event }) });
      post({ type: 'test-report', report });
    }
    if (request.type === 'run') {
      const code = await engine.runProgram(request.files, (level, text) => post({ type: 'console', level, text }));
      post({ type: 'run-complete', code });
    }
    if (request.type === 'escape-scan') {
      const exitCode = await engine.runProgram(request.files, () => undefined);
      const roots: [unknown, string][] = [[globalThis, 'globalThis'], [internal, 'INTERNAL']];
      post({ type: 'escape-report', exitCode, marked: scope[request.marker] === request.marker, ...scanReachable(roots, originals ?? new Map()) });
    }
  } catch (error) {
    post({ type: 'failed', message: `C# stopped unexpectedly: ${describe(error)}` });
  }
});
