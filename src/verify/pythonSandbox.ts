import { createHash } from 'node:crypto';
import { type ChildProcess, fork } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync, renameSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { availableParallelism } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { OutputLevel, PythonTestEvent } from '../engines/python/engine';
import { requiredPackages } from '../engines/python/packages';
import { listPythonTestNames } from '../engines/python/testNames';
import type { ProjectFiles } from '../engines/shared/project';
import type { RunReport, TestResult } from '../engines/shared/testRunner';

export type SandboxRequest =
  | { type: 'make-snapshot' }
  | { type: 'boot'; snapshot?: Uint8Array; packages?: string[] }
  | { type: 'run-tests'; files: ProjectFiles; entry: string; tests: string; startAt: number }
  | { type: 'run'; files: ProjectFiles; entry: string };

export type SandboxResponse =
  | { type: 'ready' }
  | { type: 'snapshot'; bytes: Uint8Array }
  | { type: 'failed'; message: string }
  | { type: 'test-event'; event: PythonTestEvent }
  | { type: 'test-report'; report: RunReport }
  | { type: 'console'; level: OutputLevel; text: string }
  | { type: 'run-complete'; code: number };

export interface PythonSandboxOptions {
  /** Wall-clock limit for one test, sync or async; the process is killed and a fresh one runs the remaining tests. */
  testTimeoutMs?: number;
  /** Wall-clock limit for one program run (the Run demo). */
  runTimeoutMs?: number;
  startupTimeoutMs?: number;
  /** Interpreters started ahead of time, so a fresh one per request costs no waiting. */
  prewarm?: number;
}

export const DEFAULT_TEST_TIMEOUT_MS = 6000;
const DEFAULT_RUN_TIMEOUT_MS = 15000;
const DEFAULT_STARTUP_TIMEOUT_MS = 60000;
const DEFAULT_PREWARM = Number(process.env.DOJO_PYTHON_PREWARM) || Math.max(1, Math.min(3, Math.floor(availableParallelism() / 4)));
const STDERR_TAIL_CHARACTERS = 2000;
/** JavaScript heap of a sandbox child; Pyodide itself needs well under 100 MB of it. */
export const CHILD_HEAP_LIMIT_MB = 256;
/** Maximum size of the wasm memory (the Python heap) of a sandbox child. */
export const CHILD_WASM_MEMORY_LIMIT_MB = 1024;
const WASM_PAGE_BYTES = 64 * 1024;

const VERIFY_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const CHILD_ENTRY = join(VERIFY_DIRECTORY, 'pythonSandbox.child.ts');
const PROJECT_ROOT = resolve(VERIFY_DIRECTORY, '..', '..');
const CACHE_DIRECTORY = join(realpathSync(join(PROJECT_ROOT, 'node_modules')), '.cache', 'dojo-python-sandbox');
const PYODIDE_DIRECTORY = realpathSync(dirname(createRequire(import.meta.url).resolve('pyodide/package.json')));
/** Vendored Pyodide packages (`npm run python:vendor`); the child may read them, never write. */
export const VENDORED_PACKAGES_DIRECTORY = realpathSync(join(PROJECT_ROOT, 'vendor', 'pyodide-packages'));

let childScript: Promise<string> | undefined;
let childScriptPath: string | undefined;
let snapshot: Promise<Uint8Array | undefined> | undefined;

/**
 * Bundles the child entry (TypeScript, `?raw` runtime files) into one ES module that imports Pyodide by absolute path,
 * so the child needs read access to nothing but that file and `node_modules/pyodide`. The file is named by content hash, because
 * worktrees that share one `node_modules` would otherwise run each other's child.
 */
function bundleChild(): Promise<string> {
  childScript ??= (async () => {
    const { build } = await import('vite');
    const output = await build({
      configFile: false,
      logLevel: 'silent',
      root: PROJECT_ROOT,
      build: { ssr: CHILD_ENTRY, write: false, minify: false, target: 'node22', rollupOptions: { external: ['pyodide'] } },
    });
    const bundles = Array.isArray(output) ? output : [output];
    const chunk = bundles.flatMap((bundle) => ('output' in bundle ? bundle.output : [])).find((file) => file.type === 'chunk' && file.isEntry);
    if (!chunk || chunk.type !== 'chunk') {
      throw new Error('The Python sandbox child could not be bundled.');
    }
    const pyodideUrl = JSON.stringify(pathToFileURL(join(PYODIDE_DIRECTORY, 'pyodide.mjs')).href);
    const code = chunk.code.replace(/from\s*["']pyodide["']/g, `from ${pyodideUrl}`);
    if (code === chunk.code) {
      throw new Error('The Python sandbox child bundle does not import pyodide as expected.');
    }
    mkdirSync(CACHE_DIRECTORY, { recursive: true });
    const path = join(CACHE_DIRECTORY, `python-sandbox-child-${createHash('sha256').update(code).digest('hex').slice(0, 16)}.mjs`);
    if (!existsSync(path) || readFileSync(path, 'utf8') !== code) {
      const temporary = `${path}.${process.pid}.tmp`;
      writeFileSync(temporary, code);
      renameSync(temporary, path);
    }
    childScriptPath = path;
    return path;
  })();
  return childScript;
}

type Outcome =
  | { kind: 'report'; report: RunReport }
  | { kind: 'stopped'; index: number; name: string; error: string; collected: TestResult[] }
  | { kind: 'failed'; message: string; collected: TestResult[] };

interface Pending {
  onMessage(message: SandboxResponse): void;
  onExit(reason: string): void;
}

interface Interpreter {
  process: ChildProcess;
  ready: Promise<void>;
  exited: boolean;
}

/**
 * Runs Python lesson code for verification in child processes under the Node permission model (read access to Pyodide only,
 * no writes, no child processes, no network, empty environment), with a fresh interpreter for every test run and Run demo, and a hard per-test
 * wall-clock limit enforced by killing the process.
 */
export class PythonSandbox {
  readonly testTimeoutMs: number;
  private readonly runTimeoutMs: number;
  private readonly startupTimeoutMs: number;
  private readonly prewarm: number;
  private current: Interpreter | undefined;
  private spares: Interpreter[] = [];
  private pending: Pending | undefined;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(options: PythonSandboxOptions = {}) {
    this.testTimeoutMs = options.testTimeoutMs ?? DEFAULT_TEST_TIMEOUT_MS;
    this.runTimeoutMs = options.runTimeoutMs ?? DEFAULT_RUN_TIMEOUT_MS;
    this.startupTimeoutMs = options.startupTimeoutMs ?? DEFAULT_STARTUP_TIMEOUT_MS;
    this.prewarm = options.prewarm ?? DEFAULT_PREWARM;
  }

  /**
   * Starts the first interpreter and the prewarmed spares, resolving once the first one is ready.
   */
  async start(): Promise<void> {
    await bundleChild();
    this.current ??= this.take();
    await this.current.ready;
  }

  /**
   * Kills every interpreter; the next call starts fresh ones.
   */
  stop(): void {
    this.retire();
    for (const spare of this.spares) {
      spare.process.kill('SIGKILL');
    }
    this.spares = [];
  }

  runTests(request: { files: ProjectFiles; entry: string; tests: string }): Promise<RunReport> {
    return this.serial(async () => {
      const startedAt = performance.now();
      const names = listPythonTestNames(request.tests);
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
        if (startAt >= names.length) {
          return { results, durationMs: durationMs() };
        }
      }
    });
  }

  runProgram(files: ProjectFiles, entry: string, onOutput: (level: OutputLevel, text: string) => void): Promise<number> {
    return this.serial(async () => {
      this.retire();
      const interpreter = await this.ready(requiredPackages(files));
      if (typeof interpreter === 'string') {
        onOutput('error', interpreter);
        return 1;
      }
      return new Promise<number>((resolve) => {
        const finish = (code: number) => {
          clearTimeout(timer);
          this.pending = undefined;
          resolve(code);
        };
        const timer = setTimeout(() => {
          this.retire();
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
              this.retire();
              onOutput('error', message.message);
              finish(1);
            }
          },
          onExit: (reason) => {
            onOutput('error', reason);
            finish(1);
          },
        };
        this.send(interpreter, { type: 'run', files, entry });
      });
    });
  }

  private serial<T>(task: () => Promise<T>): Promise<T> {
    const next = this.queue.then(task, task);
    this.queue = next.catch(() => undefined);
    return next;
  }

  private send(interpreter: Interpreter, request: SandboxRequest): void {
    interpreter.process.send(request);
  }

  /**
   * Kills the interpreter in use, so the next request takes a fresh one.
   */
  private retire(): void {
    const interpreter = this.current;
    this.current = undefined;
    this.pending = undefined;
    interpreter?.process.kill('SIGKILL');
  }

  private take(): Interpreter {
    let interpreter = this.spares.shift();
    while (interpreter?.exited) {
      interpreter = this.spares.shift();
    }
    interpreter ??= this.spawn();
    while (this.spares.length < this.prewarm) {
      this.spares.push(this.spawn());
    }
    return interpreter;
  }

  private async ready(packages: string[] = []): Promise<Interpreter | string> {
    try {
      await bundleChild();
      this.current ??= packages.length > 0 ? this.spawn(packages) : this.take();
      await this.current.ready;
      return this.current;
    } catch (error) {
      this.retire();
      return describe(error);
    }
  }

  private spawn(packages: string[] = []): Interpreter {
    let stderrTail = '';
    const child = forkChild();
    void this.snapshot().then((bytes) => child.connected && child.send({ type: 'boot', snapshot: bytes, packages } satisfies SandboxRequest));
    child.stderr?.on('data', (chunk: Buffer) => {
      stderrTail = (stderrTail + chunk.toString()).slice(-STDERR_TAIL_CHARACTERS);
    });
    const interpreter: Interpreter = { process: child, ready: Promise.resolve(), exited: false };
    interpreter.ready = new Promise<void>((resolve, reject) => {
      let started = false;
      const timer = setTimeout(() => {
        child.kill('SIGKILL');
        reject(new Error(`Python did not start within ${this.startupTimeoutMs}ms.`));
      }, this.startupTimeoutMs);
      child.on('message', (message: SandboxResponse) => {
        if (!started) {
          clearTimeout(timer);
          if (message.type === 'ready') {
            started = true;
            resolve();
          } else {
            reject(new Error(message.type === 'failed' ? message.message : 'Python sent an unexpected first message.'));
          }
          return;
        }
        if (this.current === interpreter) {
          this.pending?.onMessage(message);
        }
      });
      child.on('exit', (code, signal) => {
        interpreter.exited = true;
        clearTimeout(timer);
        const lastLine = stderrTail.trim().split('\n').filter((line) => line.includes('Error')).at(-1);
        const reason = `Python exited unexpectedly (${signal ?? `code ${code}`})${lastLine ? `: ${lastLine.trim()}` : ''}.`;
        if (!started) {
          reject(new Error(reason));
        }
        if (this.current === interpreter) {
          const pending = this.pending;
          this.retire();
          pending?.onExit(reason);
        }
      });
    });
    interpreter.ready.catch(() => undefined);
    return interpreter;
  }

  /**
   * Memory snapshot of a booted interpreter with the harness's standard library imported, made once per process by a
   * child that runs no lesson code; every interpreter boots from it in about 0.1 s instead of 1.5 s.
   */
  private snapshot(): Promise<Uint8Array | undefined> {
    snapshot ??= new Promise<Uint8Array | undefined>((resolve) => {
      const child = forkChild();
      const finish = (bytes: Uint8Array | undefined) => {
        clearTimeout(timer);
        child.kill('SIGKILL');
        resolve(bytes);
      };
      const timer = setTimeout(() => finish(undefined), this.startupTimeoutMs);
      child.on('message', (message: SandboxResponse) => finish(message.type === 'snapshot' ? new Uint8Array(message.bytes) : undefined));
      child.on('exit', () => finish(undefined));
      child.send({ type: 'make-snapshot' } satisfies SandboxRequest);
    });
    return snapshot;
  }

  private async attempt(request: { files: ProjectFiles; entry: string; tests: string }, startAt: number, names: string[]): Promise<Outcome> {
    const interpreter = await this.ready(requiredPackages(request.files, request.tests));
    if (typeof interpreter === 'string') {
      return { kind: 'failed', message: interpreter, collected: [] };
    }
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
        this.pending = undefined;
        resolve(outcome);
      };
      const arm = () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          this.retire();
          finish({ kind: 'stopped', ...current, error: `Test "${current.name}" did not finish within ${this.testTimeoutMs}ms and was stopped. Check for infinite loops and blocking calls such as time.sleep().`, collected });
        }, this.testTimeoutMs);
      };
      this.pending = {
        onMessage: (message) => {
          if (message.type === 'test-event') {
            if (message.event.type === 'start') {
              current = { index: message.event.index, name: message.event.name };
              running = true;
            } else {
              collected.push(message.event.result);
              running = false;
            }
            arm();
          }
          if (message.type === 'test-report') {
            finish({ kind: 'report', report: message.report });
          }
          if (message.type === 'failed') {
            this.retire();
            finish(crashed(message.message));
          }
        },
        onExit: (reason) => finish(crashed(reason)),
      };
      arm();
      this.send(interpreter, { type: 'run-tests', files: request.files, entry: request.entry, tests: request.tests, startAt });
    });
  }
}

function readyScriptPath(): string {
  if (!childScriptPath) {
    throw new Error('The Python sandbox child has not been bundled yet.');
  }
  return childScriptPath;
}

/**
 * Node flags of every sandbox child: the permission model with read access to Pyodide, the vendored packages and the child script only, no inspector activation by signal, and memory caps.
 */
export function childExecArgv(): string[] {
  return [
    '--permission',
    `--allow-fs-read=${PYODIDE_DIRECTORY}/`,
    `--allow-fs-read=${VENDORED_PACKAGES_DIRECTORY}/`,
    `--allow-fs-read=${readyScriptPath()}`,
    '--disable-sigusr1',
    `--max-old-space-size=${CHILD_HEAP_LIMIT_MB}`,
    `--wasm-max-mem-pages=${(CHILD_WASM_MEMORY_LIMIT_MB * 1024 * 1024) / WASM_PAGE_BYTES}`,
  ];
}

/**
 * Forks the bundled child under the permission model: read access to Pyodide, the vendored packages and the child script only, nothing else.
 */
function forkChild(): ChildProcess {
  const child = fork(readyScriptPath(), [`${PYODIDE_DIRECTORY}/`, `${VENDORED_PACKAGES_DIRECTORY}/`], {
    env: {},
    execArgv: childExecArgv(),
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
