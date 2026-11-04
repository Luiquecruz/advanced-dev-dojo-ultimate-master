import type { ProjectFiles } from '../shared/project';
import type { RunReport } from '../shared/testRunner';
import type { OutputLevel } from './engine';
import type { PythonWorkerRequest, PythonWorkerResponse } from './protocol';

const TEST_TIMEOUT_MS = 45000;
const RUN_TIMEOUT_MS = 15000;
const STARTUP_ALLOWANCE_MS = 30000;

let worker: Worker | undefined;
let started = false;
let queue: Promise<unknown> = Promise.resolve();
let nextRequestId = 1;

function getWorker(): Worker {
  worker ??= new Worker(new URL('./python.worker.ts', import.meta.url), { type: 'module' });
  return worker;
}

function stopWorker() {
  worker?.terminate();
  worker = undefined;
  started = false;
}

interface Exchange<T> {
  request: PythonWorkerRequest;
  timeoutMs: number;
  onMessage(message: PythonWorkerResponse, finish: (value: T) => void): void;
  onTimeout(): T;
  onFailure(message: string): T;
}

function exchange<T>({ request, timeoutMs, onMessage, onTimeout, onFailure }: Exchange<T>): Promise<T> {
  const next = queue.then(
    () =>
      new Promise<T>((resolve) => {
        const target = getWorker();
        const allowance = started ? 0 : STARTUP_ALLOWANCE_MS;
        const finish = (value: T) => {
          clearTimeout(timer);
          target.removeEventListener('message', listener);
          resolve(value);
        };
        const listener = (event: MessageEvent<PythonWorkerResponse>) => {
          if (event.data.type === 'failed') {
            stopWorker();
            finish(onFailure(event.data.message));
            return;
          }
          started = true;
          onMessage(event.data, finish);
        };
        const timer = setTimeout(() => {
          stopWorker();
          finish(onTimeout());
        }, timeoutMs + allowance);
        target.addEventListener('message', listener);
        target.postMessage(request);
      }),
  );
  queue = next;
  return next;
}

/**
 * Starts the Python worker and downloads Pyodide ahead of the first test or run.
 */
export function warmUpPython(): void {
  if (worker) {
    return;
  }
  void exchange<void>({
    request: { type: 'warm-up' },
    timeoutMs: 0,
    onMessage: (message, finish) => message.type === 'ready' && finish(),
    onTimeout: () => undefined,
    onFailure: () => undefined,
  });
}

/**
 * Whether Pyodide has already started, so the next run will not download it.
 */
export function isPythonReady(): boolean {
  return started;
}

/**
 * Grades a Python project against its `tests.py` in the Python worker.
 */
export function gradePython(files: ProjectFiles, entry: string, tests: string): Promise<RunReport> {
  const id = nextRequestId++;
  return exchange<RunReport>({
    request: { type: 'run-tests', id, files, entry, tests },
    timeoutMs: TEST_TIMEOUT_MS,
    onMessage: (message, finish) => message.type === 'test-report' && message.id === id && finish(message.report),
    onTimeout: () => ({ results: [], compileError: 'The test run took too long and was stopped. Check for infinite loops or awaits that never finish.', durationMs: TEST_TIMEOUT_MS }),
    onFailure: (message) => ({ results: [], compileError: message, durationMs: 0 }),
  });
}

/**
 * Runs a Python file as `__main__` in the Python worker and streams its output.
 */
export function runPython(files: ProjectFiles, entry: string, onOutput: (level: OutputLevel | 'info', text: string) => void): Promise<void> {
  const id = nextRequestId++;
  if (!started) {
    onOutput('info', 'Starting Python (the first run downloads the runtime)…');
  }
  return exchange<void>({
    request: { type: 'run', id, files, entry },
    timeoutMs: RUN_TIMEOUT_MS,
    onMessage: (message, finish) => {
      if (message.type === 'console' && message.id === id) {
        onOutput(message.level, message.text);
      }
      if (message.type === 'run-complete' && message.id === id) {
        finish();
      }
    },
    onTimeout: () => onOutput('error', 'The program took too long and was stopped. Check for infinite loops.'),
    onFailure: (message) => onOutput('error', message),
  });
}
