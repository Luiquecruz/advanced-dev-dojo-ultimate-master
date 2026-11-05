import { files as manifestFiles, version as manifestVersion } from '../../../vendor/dotnet/manifest.json';
import { bootFiles, checkDotnetFile, createCsharpEngine, dotnetConfig, type CsharpEngine, type DotnetFile, type DotnetRuntime, type LoadedDotnetFile } from './engine';
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
 * Gunzips `bytes` when they start with the gzip magic number; a host that already decoded the `.gz` file (by sending it with
 * `Content-Encoding: gzip`) hands over the assembly itself, which starts with `MZ`.
 */
async function gunzip(bytes: ArrayBuffer): Promise<ArrayBuffer> {
  const head = new Uint8Array(bytes, 0, Math.min(2, bytes.byteLength));
  if (head[0] !== 0x1f || head[1] !== 0x8b) {
    return bytes;
  }
  return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
}

/**
 * Fetches one runtime file from the app's origin and checks it against the SHA-256 pinned in the manifest bundled with this worker
 * (so a tampered `dotnet/` folder cannot swap its own manifest). Assemblies are served as `.dll.gz` and decompressed first, so the
 * check covers the bytes the runtime loads.
 */
async function load(file: DotnetFile): Promise<LoadedDotnetFile> {
  const compressed = file.path.endsWith('.dll');
  const response = await fetch(new URL(compressed ? `${file.path}.gz` : file.path, DOTNET_URL));
  if (!response.ok) {
    throw new Error(`dotnet/${file.path} answered ${response.status}.`);
  }
  const fetched = await response.arrayBuffer();
  const buffer = compressed ? await gunzip(fetched) : fetched;
  await checkDotnetFile(file, buffer);
  return { file, buffer };
}

/**
 * Downloads and checks every runtime file, imports the three runtime modules from the URLs whose bytes were just checked, boots the
 * runtime, warms Roslyn, then locks the scope down before any learner code runs. The import is a second request: `dotnet/<version>/`
 * is immutable and cached for a year, so it is answered from the HTTP cache the checked fetch filled (csharp-engine.md "Integrity").
 * `dotnetSidecar` tells `dotnet.js` this worker hosts the runtime itself, not a pthread.
 */
async function boot(): Promise<{ bootMs: number; warmMs: number }> {
  const startedAt = performance.now();
  refuseCsharpStringTimers(scope);
  scope.dotnetSidecar = true;
  const loaded = await Promise.all(bootFiles({ dotnet: '', roslyn: '', files: manifestFiles as DotnetFile[] }).map(load));
  const [loader, native, runtimeModule] = await Promise.all(
    JS_MODULES.map((name) => {
      if (!loaded.some(({ file }) => file.path === name)) {
        throw new Error(`The .NET manifest lists no ${name}.`);
      }
      return import(/* @vite-ignore */ new URL(name, DOTNET_URL).href) as Promise<Record<string, unknown>>;
    }),
  );
  const dotnet = loader.dotnet as DotnetHostBuilder;
  const runtime = await dotnet.withConfig(dotnetConfig(loaded, { native, runtime: runtimeModule })).create();
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
