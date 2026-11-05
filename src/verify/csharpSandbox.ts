import { createHash } from 'node:crypto';
import { type ChildProcess, fork } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { reportMismatch, type CsharpTestEvent, type OutputLevel } from '../engines/csharp/protocol';
import { listCsharpTestNames } from '../engines/csharp/testNames';
import type { ProjectFiles } from '../engines/shared/project';
import type { RunReport, TestResult } from '../engines/shared/testRunner';
import type { EscapeScanResult } from './csharpEscapeScan';

export type CsharpSandboxRequest =
  | { type: 'boot' }
  | { type: 'run-tests'; files: ProjectFiles; tests: string; startAt: number }
  | { type: 'run'; files: ProjectFiles }
  | { type: 'escape-scan'; files: ProjectFiles; marker: string };

export type CsharpSandboxResponse =
  | { type: 'ready' }
  | { type: 'failed'; message: string }
  | { type: 'test-event'; event: CsharpTestEvent }
  | { type: 'test-report'; report: RunReport }
  | { type: 'console'; level: OutputLevel; text: string }
  | { type: 'run-complete'; code: number }
  | ({ type: 'escape-report'; exitCode: number; marked: boolean } & EscapeScanResult);

export interface CsharpSandboxOptions {
  /** Wall-clock limit for one test, sync or async; the process is killed and a fresh one runs the remaining tests. */
  testTimeoutMs?: number;
  /** Wall-clock limit for one program run (the Run demo). */
  runTimeoutMs?: number;
  /** Limit for booting the runtime and warming Roslyn in a fresh child. */
  startupTimeoutMs?: number;
  /** Limit for compiling the project before the first test starts. */
  compileTimeoutMs?: number;
  /** Directory of the runtime files (default `vendor/dotnet/`); every file is checked against the pins bundled into the child. */
  dotnetDirectory?: string;
  /** Runtimes started ahead of time, so a fresh one per request costs no waiting. */
  prewarm?: number;
}

export const DEFAULT_TEST_TIMEOUT_MS = 6000;
export const DEFAULT_RUN_TIMEOUT_MS = 15000;
const DEFAULT_STARTUP_TIMEOUT_MS = 60000;
const DEFAULT_COMPILE_TIMEOUT_MS = 20000;
/**
 * Spare children kept booted; `DOJO_CSHARP_PREWARM` raises it for a run with many C# lessons. One by default: Vitest runs the C# and
 * Python sandbox files at the same time, and three .NET runtimes warming Roslyn at once made a Python per-test limit time out.
 */
const DEFAULT_PREWARM = Number(process.env.DOJO_CSHARP_PREWARM) || 1;
const STDERR_TAIL_CHARACTERS = 2000;
/** JavaScript heap of a sandbox child; the runtime keeps almost everything in wasm memory. */
export const CHILD_HEAP_LIMIT_MB = 256;
/** Maximum size of the wasm memory (the .NET heap, Roslyn included) of a sandbox child. */
export const CHILD_WASM_MEMORY_LIMIT_MB = 1024;
const WASM_PAGE_BYTES = 64 * 1024;

const VERIFY_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const CHILD_ENTRY = join(VERIFY_DIRECTORY, 'csharpSandbox.child.ts');
const PROJECT_ROOT = resolve(VERIFY_DIRECTORY, '..', '..');
const CACHE_DIRECTORY = join(realpathSync(join(PROJECT_ROOT, 'node_modules')), '.cache', 'dojo-csharp-sandbox');
/** Vendored .NET runtime, Roslyn and host (`npm run csharp:vendor`); the child may read it, never write. */
export const VENDORED_DOTNET_DIRECTORY = join(PROJECT_ROOT, 'vendor', 'dotnet');

let childScript: Promise<string> | undefined;

/**
 * Bundles the child entry (TypeScript, the manifest pins inlined) into one ES module, so the child needs read access to nothing but
 * that file and the runtime folder. The file is named by content hash, because worktrees that share one `node_modules` would otherwise
 * run each other's child.
 */
export function bundleCsharpChild(): Promise<string> {
  childScript ??= (async () => {
    const { build } = await import('vite');
    const output = await build({
      configFile: false,
      logLevel: 'silent',
      root: PROJECT_ROOT,
      build: { ssr: CHILD_ENTRY, write: false, minify: false, target: 'node22' },
    });
    const bundles = Array.isArray(output) ? output : [output];
    const chunk = bundles.flatMap((bundle) => ('output' in bundle ? bundle.output : [])).find((file) => file.type === 'chunk' && file.isEntry);
    if (!chunk || chunk.type !== 'chunk') {
      throw new Error('The C# sandbox child could not be bundled.');
    }
    mkdirSync(CACHE_DIRECTORY, { recursive: true });
    const path = join(CACHE_DIRECTORY, `csharp-sandbox-child-${createHash('sha256').update(chunk.code).digest('hex').slice(0, 16)}.mjs`);
    if (!existsSync(path) || readFileSync(path, 'utf8') !== chunk.code) {
      const temporary = `${path}.${process.pid}.tmp`;
      writeFileSync(temporary, chunk.code);
      renameSync(temporary, path);
    }
    return path;
  })();
  return childScript;
}

type Outcome =
  | { kind: 'report'; report: RunReport }
  | { kind: 'stopped'; index: number; total: number; name: string; error: string; collected: TestResult[] }
  | { kind: 'failed'; message: string; collected: TestResult[] };

interface Pending {
  onMessage(message: CsharpSandboxResponse): void;
  onExit(reason: string): void;
}

interface Runtime {
  process: ChildProcess;
  ready: Promise<void>;
  exited: boolean;
}

/**
 * Runs C# lesson code for verification in child processes under the Node permission model (read access to the runtime folder and the
 * child script only, no writes, no child processes, no network, empty environment), with a fresh runtime for every test run and Run
 * demo, and a hard per-test wall-clock limit enforced by killing the process. The child runs the browser engine's own boot, integrity
 * check and lock-down (`src/engines/csharp/`).
 */
export class CsharpSandbox {
  readonly testTimeoutMs: number;
  private readonly runTimeoutMs: number;
  private readonly startupTimeoutMs: number;
  private readonly compileTimeoutMs: number;
  private readonly prewarm: number;
  private readonly dotnetDirectory: string;
  private current: Runtime | undefined;
  private spares: Runtime[] = [];
  private pending: Pending | undefined;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(options: CsharpSandboxOptions = {}) {
    this.testTimeoutMs = options.testTimeoutMs ?? DEFAULT_TEST_TIMEOUT_MS;
    this.runTimeoutMs = options.runTimeoutMs ?? DEFAULT_RUN_TIMEOUT_MS;
    this.startupTimeoutMs = options.startupTimeoutMs ?? DEFAULT_STARTUP_TIMEOUT_MS;
    this.compileTimeoutMs = options.compileTimeoutMs ?? DEFAULT_COMPILE_TIMEOUT_MS;
    this.prewarm = options.prewarm ?? DEFAULT_PREWARM;
    this.dotnetDirectory = realpathSync(options.dotnetDirectory ?? VENDORED_DOTNET_DIRECTORY);
  }

  /**
   * Starts the first runtime and the prewarmed spares, resolving once the first one is ready.
   */
  async start(): Promise<void> {
    const script = await bundleCsharpChild();
    this.current ??= this.take(script);
    await this.current.ready;
  }

  /**
   * Kills every runtime; the next call starts fresh ones.
   */
  stop(): void {
    this.retire();
    for (const spare of this.spares) {
      spare.process.kill('SIGKILL');
    }
    this.spares = [];
  }

  runTests(request: { files: ProjectFiles; tests: string }): Promise<RunReport> {
    return this.serial(async () => {
      const startedAt = performance.now();
      const names = listCsharpTestNames(request.tests);
      const durationMs = () => Math.round(performance.now() - startedAt);
      this.retire();
      const results: TestResult[] = [];
      let startAt = 0;
      for (;;) {
        const outcome = await this.attempt(request, startAt, names);
        if (outcome.kind === 'report') {
          const { compileError } = outcome.report;
          return { results: [...results, ...outcome.report.results], ...(compileError === undefined ? {} : { compileError }), durationMs: durationMs() };
        }
        results.push(...outcome.collected);
        if (outcome.kind === 'failed') {
          return { results, compileError: outcome.message, durationMs: durationMs() };
        }
        results.push({ name: outcome.name, passed: false, error: outcome.error });
        startAt = outcome.index + 1;
        if (startAt >= outcome.total) {
          return { results, durationMs: durationMs() };
        }
      }
    });
  }

  runProgram(files: ProjectFiles, onOutput: (level: OutputLevel, text: string) => void): Promise<number> {
    return this.serial(async () => {
      this.retire();
      const runtime = await this.ready();
      if (typeof runtime === 'string') {
        onOutput('error', runtime);
        return 1;
      }
      return new Promise<number>((resolve) => {
        const finish = (code: number) => {
          clearTimeout(timer);
          this.retire();
          resolve(code);
        };
        const timer = setTimeout(() => {
          onOutput('error', `The program did not finish within ${this.runTimeoutMs}ms and was stopped. Check for infinite loops.`);
          finish(1);
        }, this.runTimeoutMs);
        this.pending = {
          onMessage: (message) => {
            if (message.type === 'console') {
              onOutput(message.level, message.text);
            }
            if (message.type === 'run-complete') {
              finish(message.code);
            }
            if (message.type === 'failed') {
              onOutput('error', message.message);
              finish(1);
            }
          },
          onExit: (reason) => {
            onOutput('error', reason);
            finish(1);
          },
        };
        runtime.process.send({ type: 'run', files } satisfies CsharpSandboxRequest);
      });
    });
  }

  /**
   * Regression check of the lock-down (`csharpEscapeScan.ts`): runs `files` as a program in a fresh runtime (it should set
   * `JSHost.GlobalThis[marker] = marker`, proving the scan starts from the object C# reaches), then scans what C# can reach.
   */
  escapeScan(files: ProjectFiles, marker: string): Promise<{ exitCode: number; marked: boolean } & EscapeScanResult> {
    return this.serial(async () => {
      this.retire();
      const runtime = await this.ready();
      if (typeof runtime === 'string') {
        throw new Error(runtime);
      }
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          this.retire();
          reject(new Error('The escape scan did not finish in time.'));
        }, this.runTimeoutMs * 4);
        const settle = (finish: () => void) => {
          clearTimeout(timer);
          this.retire();
          finish();
        };
        this.pending = {
          onMessage: (message) => {
            if (message.type === 'escape-report') {
              const { exitCode, marked, findings, visited } = message;
              settle(() => resolve({ exitCode, marked, findings, visited }));
            }
            if (message.type === 'failed') {
              settle(() => reject(new Error(message.message)));
            }
          },
          onExit: (reason) => settle(() => reject(new Error(reason))),
        };
        runtime.process.send({ type: 'escape-scan', files, marker } satisfies CsharpSandboxRequest);
      });
    });
  }

  private serial<T>(task: () => Promise<T>): Promise<T> {
    const next = this.queue.then(task, task);
    this.queue = next.catch(() => undefined);
    return next;
  }

  /**
   * Kills the runtime in use, so the next request takes a fresh one.
   */
  private retire(): void {
    const runtime = this.current;
    this.current = undefined;
    this.pending = undefined;
    runtime?.process.kill('SIGKILL');
  }

  private take(script: string): Runtime {
    let runtime = this.spares.shift();
    while (runtime?.exited) {
      runtime = this.spares.shift();
    }
    runtime ??= this.spawn(script);
    while (this.spares.length < this.prewarm) {
      this.spares.push(this.spawn(script));
    }
    return runtime;
  }

  private async ready(): Promise<Runtime | string> {
    try {
      const script = await bundleCsharpChild();
      this.current ??= this.take(script);
      await this.current.ready;
      return this.current;
    } catch (error) {
      this.retire();
      return describe(error);
    }
  }

  private spawn(script: string): Runtime {
    let stderrTail = '';
    const child = forkChild(script, this.dotnetDirectory);
    child.send({ type: 'boot' } satisfies CsharpSandboxRequest);
    child.stderr?.on('data', (chunk: Buffer) => {
      stderrTail = (stderrTail + chunk.toString()).slice(-STDERR_TAIL_CHARACTERS);
    });
    const runtime: Runtime = { process: child, ready: Promise.resolve(), exited: false };
    runtime.ready = new Promise<void>((resolve, reject) => {
      let started = false;
      const timer = setTimeout(() => {
        child.kill('SIGKILL');
        reject(new Error(`C# did not start within ${this.startupTimeoutMs}ms.`));
      }, this.startupTimeoutMs);
      child.on('message', (message: CsharpSandboxResponse) => {
        if (!started) {
          clearTimeout(timer);
          if (message.type === 'ready') {
            started = true;
            resolve();
          } else {
            reject(new Error(message.type === 'failed' ? message.message : 'C# sent an unexpected first message.'));
          }
          return;
        }
        if (this.current === runtime) {
          this.pending?.onMessage(message);
        }
      });
      child.on('exit', (code, signal) => {
        runtime.exited = true;
        clearTimeout(timer);
        const lastLine = stderrTail.trim().split('\n').filter((line) => line.includes('Error')).at(-1);
        const reason = `C# exited unexpectedly (${signal ?? `code ${code}`})${lastLine ? `: ${lastLine.trim()}` : ''}.`;
        if (!started) {
          reject(new Error(reason));
        }
        if (this.current === runtime) {
          const pending = this.pending;
          this.retire();
          pending?.onExit(reason);
        }
      });
    });
    runtime.ready.catch(() => undefined);
    return runtime;
  }

  private async attempt(request: { files: ProjectFiles; tests: string }, startAt: number, names: string[]): Promise<Outcome> {
    const runtime = await this.ready();
    if (typeof runtime === 'string') {
      return { kind: 'failed', message: runtime, collected: [] };
    }
    return new Promise<Outcome>((resolve) => {
      const collected: TestResult[] = [];
      let current = { index: startAt, total: names.length, name: names[startAt] ?? `test ${startAt + 1}` };
      let running = false;
      let compiled = false;
      const crashed = (reason: string): Outcome =>
        running
          ? { kind: 'stopped', ...current, error: `C# crashed while running this test and was restarted for the next one: ${reason}`, collected }
          : { kind: 'failed', message: reason, collected };
      let timer: ReturnType<typeof setTimeout> | undefined;
      const finish = (outcome: Outcome) => {
        clearTimeout(timer);
        this.retire();
        resolve(outcome);
      };
      const arm = () => {
        clearTimeout(timer);
        timer = compiled
          ? setTimeout(() => finish({ kind: 'stopped', ...current, error: `Test "${current.name}" did not finish within ${this.testTimeoutMs}ms and was stopped. Check for infinite loops and tasks that never complete.`, collected }), this.testTimeoutMs)
          : setTimeout(() => finish({ kind: 'failed', message: `Compiling took longer than ${this.compileTimeoutMs}ms and was stopped.`, collected }), this.compileTimeoutMs);
      };
      this.pending = {
        onMessage: (message) => {
          if (message.type === 'test-event') {
            compiled = true;
            if (message.event.type === 'start') {
              current = { index: message.event.index, total: message.event.total, name: message.event.name };
              running = true;
            } else {
              collected.push(message.event.result);
              running = false;
            }
            arm();
          }
          if (message.type === 'test-report') {
            const mismatch = reportMismatch(message.report, collected, names, startAt);
            finish(mismatch ? { kind: 'failed', message: mismatch, collected: [] } : { kind: 'report', report: message.report });
          }
          if (message.type === 'failed') {
            finish(crashed(message.message));
          }
        },
        onExit: (reason) => finish(crashed(reason)),
      };
      arm();
      runtime.process.send({ type: 'run-tests', files: request.files, tests: request.tests, startAt } satisfies CsharpSandboxRequest);
    });
  }
}

/**
 * Node flags of every sandbox child: the permission model with read access to the runtime folder and the child script only, no
 * inspector activation by signal, and memory caps.
 */
export function csharpChildExecArgv(script: string, dotnetDirectory: string): string[] {
  return [
    '--permission',
    `--allow-fs-read=${dotnetDirectory}/`,
    `--allow-fs-read=${script}`,
    '--disable-sigusr1',
    `--max-old-space-size=${CHILD_HEAP_LIMIT_MB}`,
    `--wasm-max-mem-pages=${(CHILD_WASM_MEMORY_LIMIT_MB * 1024 * 1024) / WASM_PAGE_BYTES}`,
  ];
}

function forkChild(script: string, dotnetDirectory: string): ChildProcess {
  const child = fork(script, [`${dotnetDirectory}/`], {
    env: {},
    execArgv: csharpChildExecArgv(script, dotnetDirectory),
    serialization: 'advanced',
    stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
  });
  child.unref();
  child.channel?.unref();
  return child;
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
