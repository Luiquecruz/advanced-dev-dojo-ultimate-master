import { files as manifestFiles, version as manifestVersion } from '../../../vendor/dotnet/manifest.json';
import { bootFiles, checkDotnetFile, createCsharpEngine, dotnetConfig, isCriticalDotnetFile, type CsharpEngine, type DotnetAsset, type DotnetFile, type DotnetRuntime } from './engine';
import { lockDownCsharp, refuseCsharpStringTimers } from './lockdown';
import type { CsharpWorkerRequest, CsharpWorkerResponse } from './protocol';

interface DotnetHostBuilder {
  withConfig(config: Record<string, unknown>): DotnetHostBuilder;
  create(): Promise<DotnetRuntime>;
}

const DOTNET_URL = new URL(`${import.meta.env.BASE_URL}dotnet/${manifestVersion}/`, self.location.origin).href;
const JS_MODULES = ['dotnet.js', 'dotnet.native.js', 'dotnet.runtime.js'] as const;
const scope = self as unknown as Record<string, unknown>;
const postToClient = self.postMessage.bind(self);

let engine: CsharpEngine | undefined;

function post(message: CsharpWorkerResponse) {
  postToClient(message);
}

/**
 * A readable message for a boot or run failure; the runtime rejects with an `ExitStatus` (`{ status, message }`) when the program
 * exits or overflows its stack.
 */
function describe(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'object' && error !== null && 'status' in error) {
    return 'the program exited (a stack overflow or Environment.Exit).';
  }
  return String(error);
}

/**
 * Starts fetching one runtime file from the app's origin; the promise resolves to its bytes once they match the SHA-256 pinned in
 * the manifest bundled with this worker (so a tampered `dotnet/` folder cannot swap its own manifest). Every file is a `.js` or
 * `.wasm` the host compresses itself; the runtime's own files are fetched with high priority.
 */
function load(file: DotnetFile): DotnetAsset {
  const download = async () => {
    const response = await fetch(new URL(file.path, DOTNET_URL), { priority: isCriticalDotnetFile(file) ? 'high' : 'auto' });
    if (!response.ok) {
      throw new Error(`dotnet/${file.path} answered ${response.status}.`);
    }
    const buffer = await response.arrayBuffer();
    await checkDotnetFile(file, buffer);
    return buffer;
  };
  return { file, bytes: download() };
}

/**
 * Fetches every runtime file in parallel over the app's HTTP/2 connection (`bootFiles` order: the runtime's JavaScript, then the
 * largest first), imports the three runtime modules as soon as their own bytes are checked, and starts the runtime while the
 * assemblies are still arriving: each one reaches it only after its check. Then it warms Roslyn and locks the scope down before any
 * learner code runs. The import is a second request: `dotnet/<version>/` is immutable and cached for a year, so it is answered from
 * the HTTP cache the checked fetch filled (csharp-engine.md "Integrity"). `dotnetSidecar` tells `dotnet.js` this worker hosts the
 * runtime itself, not a pthread.
 */
async function boot(): Promise<{ bootMs: number; warmMs: number }> {
  const startedAt = performance.now();
  refuseCsharpStringTimers(scope);
  scope.dotnetSidecar = true;
  const assets = bootFiles({ dotnet: '', roslyn: '', files: manifestFiles as DotnetFile[] }).map(load);
  const checked = Promise.all(assets.map(({ bytes }) => bytes));
  checked.catch(() => undefined);
  const [loader, native, runtimeModule] = await Promise.all(
    JS_MODULES.map(async (name) => {
      const asset = assets.find(({ file }) => file.path === name);
      if (!asset) {
        throw new Error(`The .NET manifest lists no ${name}.`);
      }
      await asset.bytes;
      return import(/* @vite-ignore */ new URL(name, DOTNET_URL).href) as Promise<Record<string, unknown>>;
    }),
  );
  const dotnet = loader.dotnet as DotnetHostBuilder;
  const [runtime] = await Promise.all([dotnet.withConfig(dotnetConfig(assets, { native, runtime: runtimeModule })).create(), checked]);
  const csharp = await createCsharpEngine(runtime);
  const bootedAt = performance.now();
  await csharp.warm();
  const warmMs = Math.round(performance.now() - bootedAt);
  lockDownCsharp(scope, runtime.INTERNAL);
  engine = csharp;
  return { bootMs: Math.round(bootedAt - startedAt), warmMs };
}

self.addEventListener('message', async (event: MessageEvent<CsharpWorkerRequest>) => {
  const message = event.data;
  try {
    if (message.type === 'boot') {
      post({ type: 'ready', ...(await boot()) });
      return;
    }
    if (!engine) {
      post({ type: 'failed', message: 'C# stopped unexpectedly: the runtime has not started.' });
      return;
    }
    if (message.type === 'run-tests') {
      const { id } = message;
      const report = await engine.runTests({ ...message, onEvent: (testEvent) => post({ type: 'test-event', id, event: testEvent }) });
      post({ type: 'test-report', id, report });
    }
    if (message.type === 'run') {
      const { id } = message;
      const exitCode = await engine.runProgram(message.files, (level, text) => post({ type: 'console', id, level, text }));
      post({ type: 'run-complete', id, exitCode });
    }
  } catch (error) {
    post({ type: 'failed', message: `${message.type === 'boot' ? 'C# could not start' : 'C# stopped unexpectedly'}: ${describe(error)}` });
  }
});
