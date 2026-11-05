import type { ProjectFiles } from '../shared/project';
import type { RunReport, TestResult } from '../shared/testRunner';
import { reportMismatch, type CsharpWorkerRequest, type CsharpWorkerResponse, type OutputLevel } from './protocol';
import { listCsharpTestNames } from './testNames';

/** Wall-clock limit for one test, sync or async, the same as the Python engine. */
export const TEST_TIMEOUT_MS = 6000;
/** Limit for compiling the project before the first test starts (a cold Roslyn compile measured up to ≈ 2.4 s). */
const COMPILE_TIMEOUT_MS = 20000;
const RUN_TIMEOUT_MS = 15000;
const BOOT_TIMEOUT_MS = 90000;
/** Longest console line passed to the page; the host already stops a run's console after 1,000,000 characters. */
export const MAX_CONSOLE_TEXT = 10000;

export interface CsharpTimings {
  /** Download, hash check and `create()` of the runtime. */
  bootMs: number;
  /** The throwaway Roslyn compile that warms the worker. */
  warmMs: number;
}

interface Runtime {
  worker: Worker;
  ready: Promise<CsharpTimings>;
}

type Outcome =
  | { kind: 'report'; report: RunReport }
  | { kind: 'stopped'; index: number; total: number; name: string; error: string; collected: TestResult[] }
  | { kind: 'failed'; message: string; collected: TestResult[] };

let spare: Runtime | undefined;
/** Whether a C# challenge is open: `warmUpCsharp` sets it, `disposeCsharp` clears it, and runs refill the spare only while it is set. */
let wanted = false;
let lastTimings: CsharpTimings | undefined;
let queue: Promise<unknown> = Promise.resolve();

function createWorker(): Worker {
  return new Worker(new URL('./csharp.worker.ts', import.meta.url), { type: 'module' });
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function clip(text: string): string {
  return text.length > MAX_CONSOLE_TEXT ? `${text.slice(0, MAX_CONSOLE_TEXT)}… [line truncated]` : text;
}

function spawn(): Runtime {
  const worker = createWorker();
  const ready = new Promise<CsharpTimings>((resolve, reject) => {
    const finish = (settle: () => void) => {
      clearTimeout(timer);
      worker.removeEventListener('message', onMessage);
      worker.removeEventListener('error', onError);
      settle();
    };
    const onMessage = ({ data }: MessageEvent<CsharpWorkerResponse>) => {
      if (data.type === 'failed') {
        finish(() => reject(new Error(data.message)));
      }
      if (data.type === 'ready') {
        finish(() => resolve({ bootMs: data.bootMs, warmMs: data.warmMs }));
      }
    };
    const onError = (event: ErrorEvent) => finish(() => reject(new Error(`C# could not start: ${event.message || 'the worker failed to load.'}`)));
    const timer = setTimeout(() => finish(() => reject(new Error('C# could not start: it took too long.'))), BOOT_TIMEOUT_MS);
    worker.addEventListener('message', onMessage);
    worker.addEventListener('error', onError);
    worker.postMessage({ type: 'boot' } satisfies CsharpWorkerRequest);
  });
  const runtime = { worker, ready };
  ready.then(
    (timings) => {
      lastTimings = timings;
    },
    () => {
      worker.terminate();
      if (spare === runtime) {
        spare = undefined;
      }
    },
  );
  return runtime;
}

/**
 * Takes the warm runtime, or starts one. Every run gets a fresh worker, so files, static fields of the BCL and AppContext switches
 * written by one run never reach the next (spike findings C4, C5). The next spare starts only when the run is over (`refill`), so
 * two .NET runtimes never compete for the CPU and memory of a grade.
 */
function take(): Runtime {
  const runtime = spare ?? spawn();
  spare = undefined;
  return runtime;
}

/**
 * Starts the next spare after a run, so the following run waits for no download or warm-up unless runs come faster than one boot.
 */
function refill(): void {
  if (wanted) {
    spare ??= spawn();
  }
}

function serial<T>(task: () => Promise<T>): Promise<T> {
  const next = queue.then(task, task);
  queue = next.catch(() => undefined);
  return next;
}

function attempt(runtime: Runtime, files: ProjectFiles, tests: string, startAt: number, names: string[]): Promise<Outcome> {
  const id = crypto.randomUUID();
  const { worker } = runtime;
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
      worker.removeEventListener('message', onMessage);
      worker.removeEventListener('error', onError);
      worker.terminate();
      resolve(outcome);
    };
    const arm = () => {
      clearTimeout(timer);
      timer = compiled
        ? setTimeout(() => finish({ kind: 'stopped', ...current, error: `Test "${current.name}" did not finish within ${TEST_TIMEOUT_MS}ms and was stopped. Check for infinite loops and tasks that never complete.`, collected }), TEST_TIMEOUT_MS)
        : setTimeout(() => finish({ kind: 'failed', message: `Compiling took longer than ${COMPILE_TIMEOUT_MS / 1000}s and was stopped.`, collected }), COMPILE_TIMEOUT_MS);
    };
    const onMessage = ({ data }: MessageEvent<CsharpWorkerResponse>) => {
      if (data.type === 'failed') {
        finish(crashed(data.message));
        return;
      }
      if (!('id' in data) || data.id !== id) {
        return;
      }
      if (data.type === 'test-event') {
        compiled = true;
        if (data.event.type === 'start') {
          current = { index: data.event.index, total: data.event.total, name: data.event.name };
          running = true;
        } else {
          collected.push(data.event.result);
          running = false;
        }
        arm();
      }
      if (data.type === 'test-report') {
        const mismatch = reportMismatch(data.report, collected, names, startAt);
        finish(mismatch ? { kind: 'failed', message: mismatch, collected: [] } : { kind: 'report', report: data.report });
      }
    };
    const onError = (event: ErrorEvent) => finish(crashed(event.message || 'C# stopped unexpectedly.'));
    worker.addEventListener('message', onMessage);
    worker.addEventListener('error', onError);
    arm();
    worker.postMessage({ type: 'run-tests', id, files, tests, startAt } satisfies CsharpWorkerRequest);
  });
}

/**
 * Starts the .NET runtime ahead of the first test or run: downloads and checks the runtime files and warms Roslyn in one worker.
 */
export function warmUpCsharp(): void {
  wanted = true;
  spare ??= spawn();
}

/**
 * Terminates the spare runtime, so a booted .NET runtime and Roslyn do not stay in memory after the learner leaves C# challenges.
 */
export function disposeCsharp(): void {
  wanted = false;
  spare?.worker.terminate();
  spare = undefined;
}

/**
 * Boot and warm-up times of the latest runtime that started, or undefined before the first one (the next run downloads the runtime).
 */
export function csharpTimings(): CsharpTimings | undefined {
  return lastTimings;
}

/**
 * Grades a C# project against its `tests.cs` in a fresh worker; a test that runs past the limit is stopped (the worker is terminated,
 * the only way to stop a busy loop on the single-threaded runtime) and the remaining tests run in another fresh worker, up to the
 * number of tests the host discovered.
 */
export function gradeCsharp(files: ProjectFiles, tests: string): Promise<RunReport> {
  return serial(async () => {
    const startedAt = performance.now();
    const durationMs = () => Math.round(performance.now() - startedAt);
    const names = listCsharpTestNames(tests);
    const results: TestResult[] = [];
    let startAt = 0;
    try {
      for (;;) {
        const runtime = take();
        try {
          await runtime.ready;
        } catch (error) {
          return { results, compileError: describe(error), durationMs: durationMs() };
        }
        const outcome = await attempt(runtime, files, tests, startAt, names);
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
    } finally {
      refill();
    }
  });
}

/**
 * Compiles a C# project as a console program in a fresh worker, runs its entry point and streams its output.
 */
export function runCsharp(files: ProjectFiles, onOutput: (level: OutputLevel | 'info', text: string) => void): Promise<void> {
  return serial(async () => {
    if (!lastTimings) {
      onOutput('info', 'Starting C# (the first run downloads the .NET runtime)…');
    }
    const runtime = take();
    try {
      await runtime.ready;
    } catch (error) {
      onOutput('error', describe(error));
      refill();
      return;
    }
    const id = crypto.randomUUID();
    const { worker } = runtime;
    await new Promise<void>((resolve) => {
      const finish = () => {
        clearTimeout(timer);
        worker.removeEventListener('message', onMessage);
        worker.removeEventListener('error', onError);
        worker.terminate();
        resolve();
      };
      const timer = setTimeout(() => {
        onOutput('error', 'The program took too long and was stopped. Check for infinite loops.');
        finish();
      }, RUN_TIMEOUT_MS);
      const onMessage = ({ data }: MessageEvent<CsharpWorkerResponse>) => {
        if (data.type === 'failed') {
          onOutput('error', data.message);
          finish();
          return;
        }
        if (data.type === 'console' && data.id === id) {
          onOutput(data.level, clip(data.text));
        }
        if (data.type === 'run-complete' && data.id === id) {
          finish();
        }
      };
      const onError = (event: ErrorEvent) => {
        onOutput('error', `C# stopped unexpectedly: ${event.message || 'the worker crashed (out of memory or a runtime abort).'}`);
        finish();
      };
      worker.addEventListener('message', onMessage);
      worker.addEventListener('error', onError);
      worker.postMessage({ type: 'run', id, files } satisfies CsharpWorkerRequest);
    });
    refill();
  });
}
