import type { ProjectFiles } from '../shared/project';
import type { RunReport, TestResult } from '../shared/testRunner';
import type { OutputLevel } from './engine';
import type { PythonWorkerRequest, PythonWorkerResponse } from './protocol';
import { requiredPackages } from './packages';
import { listPythonTestNames } from './testNames';

/** Wall-clock limit for one test, sync or async, the same as in verification. */
export const TEST_TIMEOUT_MS = 6000;
const RUN_TIMEOUT_MS = 15000;
const BOOT_TIMEOUT_MS = 60000;

interface Interpreter {
  worker: Worker;
  ready: Promise<void>;
}

type Outcome =
  | { kind: 'report'; report: RunReport }
  | { kind: 'stopped'; index: number; name: string; error: string; collected: TestResult[] }
  | { kind: 'failed'; message: string; collected: TestResult[] };

let snapshot: Promise<Uint8Array | undefined> | undefined;
let spare: Interpreter | undefined;
let started = false;
let queue: Promise<unknown> = Promise.resolve();
let nextRequestId = 1;

function createWorker(): Worker {
  return new Worker(new URL('./python.worker.ts', import.meta.url), { type: 'module' });
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Waits for the first message a worker answers to `request` that `accept` maps to a value, failing on `failed`, worker errors or the timeout.
 */
function answer<T>(worker: Worker, request: PythonWorkerRequest, timeoutMs: number, accept: (message: PythonWorkerResponse) => T | undefined): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const finish = (settle: () => void) => {
      clearTimeout(timer);
      worker.removeEventListener('message', onMessage);
      worker.removeEventListener('error', onError);
      settle();
    };
    const onMessage = (event: MessageEvent<PythonWorkerResponse>) => {
      if (event.data.type === 'failed') {
        const { message } = event.data;
        finish(() => reject(new Error(message)));
        return;
      }
      const value = accept(event.data);
      if (value !== undefined) {
        finish(() => resolve(value));
      }
    };
    const onError = (event: ErrorEvent) => finish(() => reject(new Error(event.message || 'The Python worker failed to load.')));
    const timer = setTimeout(() => finish(() => reject(new Error('Python took too long to start.'))), timeoutMs);
    worker.addEventListener('message', onMessage);
    worker.addEventListener('error', onError);
    worker.postMessage(request);
  });
}

/**
 * A memory snapshot of a booted interpreter, made once per page by a worker that runs no lesson code; every later interpreter boots from it.
 */
function getSnapshot(): Promise<Uint8Array | undefined> {
  snapshot ??= (async () => {
    const maker = createWorker();
    try {
      return await answer(maker, { type: 'make-snapshot' }, BOOT_TIMEOUT_MS, (message) => (message.type === 'snapshot' ? message.bytes : undefined));
    } catch {
      return undefined;
    } finally {
      maker.terminate();
    }
  })();
  return snapshot;
}

function spawn(packages: string[] = []): Interpreter {
  const worker = createWorker();
  const ready = getSnapshot().then((bytes) =>
    answer(worker, { type: 'boot', snapshot: bytes, packages }, BOOT_TIMEOUT_MS, (message) => (message.type === 'ready' ? true : undefined)).then(() => {
      started = true;
    }),
  );
  ready.catch(() => worker.terminate());
  return { worker, ready };
}

/**
 * Takes the warm interpreter (or starts one) and starts the next spare once this one is ready, so a fresh interpreter per run costs no waiting.
 * A run that imports vendored packages gets its own interpreter with them loaded, so other lessons never pay for them.
 */
function take(packages: string[] = []): Interpreter {
  if (packages.length > 0) {
    return spawn(packages);
  }
  const interpreter = spare ?? spawn();
  spare = undefined;
  void interpreter.ready.then(
    () => {
      spare ??= spawn();
    },
    () => undefined,
  );
  return interpreter;
}

function serial<T>(task: () => Promise<T>): Promise<T> {
  const next = queue.then(task, task);
  queue = next.catch(() => undefined);
  return next;
}

function attempt(interpreter: Interpreter, files: ProjectFiles, entry: string, tests: string, startAt: number, names: string[]): Promise<Outcome> {
  const id = nextRequestId++;
  const { worker } = interpreter;
  return new Promise<Outcome>((resolve) => {
    const collected: TestResult[] = [];
    let current = { index: startAt, name: names[startAt] ?? `test ${startAt + 1}` };
    let running = false;
    const crashed = (reason: string): Outcome =>
      running
        ? { kind: 'stopped', ...current, error: `Python crashed while running this test and was restarted for the next one: ${reason}`, collected }
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
      timer = setTimeout(() => finish({ kind: 'stopped', ...current, error: `Test "${current.name}" did not finish within ${TEST_TIMEOUT_MS}ms and was stopped. Check for infinite loops and blocking calls such as time.sleep().`, collected }), TEST_TIMEOUT_MS);
    };
    const onMessage = ({ data }: MessageEvent<PythonWorkerResponse>) => {
      if (data.type === 'failed') {
        finish(crashed(data.message));
        return;
      }
      if (!('id' in data) || data.id !== id) {
        return;
      }
      if (data.type === 'test-event') {
        if (data.event.type === 'start') {
          current = { index: data.event.index, name: data.event.name };
          running = true;
        } else {
          collected.push(data.event.result);
          running = false;
        }
        arm();
      }
      if (data.type === 'test-report') {
        finish({ kind: 'report', report: data.report });
      }
    };
    const onError = (event: ErrorEvent) => finish(crashed(event.message || 'Python stopped unexpectedly.'));
    worker.addEventListener('message', onMessage);
    worker.addEventListener('error', onError);
    arm();
    worker.postMessage({ type: 'run-tests', id, files, entry, tests, startAt } satisfies PythonWorkerRequest);
  });
}

/**
 * Starts the Python runtime ahead of the first test or run: downloads Pyodide, makes the boot snapshot and warms one interpreter.
 */
export function warmUpPython(): void {
  spare ??= spawn();
}

/**
 * Whether Pyodide has already started, so the next run will not download it.
 */
export function isPythonReady(): boolean {
  return started;
}

/**
 * Grades a Python project against its `tests.py` in a fresh worker; a test that runs past the limit is stopped and the remaining tests run in another fresh worker.
 */
export function gradePython(files: ProjectFiles, entry: string, tests: string): Promise<RunReport> {
  return serial(async () => {
    const startedAt = performance.now();
    const durationMs = () => Math.round(performance.now() - startedAt);
    const names = listPythonTestNames(tests);
    const results: TestResult[] = [];
    let startAt = 0;
    for (;;) {
      const interpreter = take(requiredPackages(files, tests));
      try {
        await interpreter.ready;
      } catch (error) {
        return { results, compileError: `Python could not start: ${describe(error)}`, durationMs: durationMs() };
      }
      const outcome = await attempt(interpreter, files, entry, tests, startAt, names);
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
      if (startAt >= names.length) {
        return { results, durationMs: durationMs() };
      }
    }
  });
}

/**
 * Runs a Python file as `__main__` in a fresh worker and streams its output.
 */
export function runPython(files: ProjectFiles, entry: string, onOutput: (level: OutputLevel | 'info', text: string) => void): Promise<void> {
  return serial(async () => {
    if (!started) {
      onOutput('info', 'Starting Python (the first run downloads the runtime)…');
    }
    const interpreter = take(requiredPackages(files));
    try {
      await interpreter.ready;
    } catch (error) {
      onOutput('error', `Python could not start: ${describe(error)}`);
      return;
    }
    const id = nextRequestId++;
    const { worker } = interpreter;
    await new Promise<void>((resolve) => {
      const finish = () => {
        clearTimeout(timer);
        worker.removeEventListener('message', onMessage);
        worker.terminate();
        resolve();
      };
      const timer = setTimeout(() => {
        onOutput('error', 'The program took too long and was stopped. Check for infinite loops.');
        finish();
      }, RUN_TIMEOUT_MS);
      const onMessage = ({ data }: MessageEvent<PythonWorkerResponse>) => {
        if (data.type === 'failed') {
          onOutput('error', data.message);
          finish();
          return;
        }
        if (data.type === 'console' && data.id === id) {
          onOutput(data.level, data.text);
        }
        if (data.type === 'run-complete' && data.id === id) {
          finish();
        }
      };
      worker.addEventListener('message', onMessage);
      worker.postMessage({ type: 'run', id, files, entry } satisfies PythonWorkerRequest);
    });
  });
}
