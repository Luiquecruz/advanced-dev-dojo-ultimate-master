import EventEmitter from 'events/events.js';

const INITIAL_ENV: Record<string, string> = { NODE_ENV: 'development', HOME: '/home/dojo', PATH: '/usr/local/bin:/usr/bin:/bin' };
const INITIAL_ARGV = ['/usr/local/bin/node', '/app/main.js'];
const START = performance.now();

/**
 * Thrown by process.exit() to stop the running program.
 */
export class ProcessExit extends Error {
  constructor(readonly code: number) {
    super(`process.exit(${code})`);
    this.name = 'ProcessExit';
  }
}

let tickQueue: Array<() => void> = [];

function flushTicks(): void {
  while (tickQueue.length > 0) {
    tickQueue.shift()!();
  }
}

class Output {
  private buffer = '';

  constructor(private readonly level: 'log' | 'error') {}

  write(chunk: unknown): boolean {
    this.buffer += String(chunk);
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() ?? '';
    lines.forEach((line) => console[this.level](line));
    return true;
  }

  flush(): void {
    if (this.buffer) {
      console[this.level](this.buffer);
      this.buffer = '';
    }
  }

  get isTTY(): boolean {
    return false;
  }
}

class NodeProcess extends EventEmitter {
  readonly env: Record<string, string | undefined> = { ...INITIAL_ENV };
  readonly argv = [...INITIAL_ARGV];
  execArgv: string[] = [];
  exitCode: number | undefined = undefined;
  readonly platform = 'linux';
  readonly arch = 'x64';
  readonly pid = 4242;
  readonly ppid = 1;
  readonly title = 'node';
  readonly version = 'v24.11.0';
  readonly versions = { node: '24.11.0', v8: '13.6', uv: '1.51.0' };
  readonly release = { name: 'node', lts: 'Krypton' };
  readonly stdout = new Output('log');
  readonly stderr = new Output('error');
  private directory = '/app';

  cwd(): string {
    return this.directory;
  }

  chdir(directory: string): void {
    this.directory = directory;
  }

  exit(code?: number): never {
    const exitCode = code ?? this.exitCode ?? 0;
    this.exitCode = exitCode;
    this.emit('exit', exitCode);
    throw new ProcessExit(exitCode);
  }

  nextTick(callback: (...args: any[]) => void, ...args: unknown[]): void {
    if (tickQueue.length === 0) {
      queueMicrotask(flushTicks);
    }
    tickQueue.push(() => callback(...args));
  }

  uptime(): number {
    return (performance.now() - START) / 1000;
  }

  memoryUsage() {
    return { rss: 48_000_000, heapTotal: 16_000_000, heapUsed: 9_000_000, external: 1_000_000, arrayBuffers: 50_000 };
  }

  cpuUsage() {
    return { user: Math.round(this.uptime() * 1e5), system: Math.round(this.uptime() * 2e4) };
  }

  emitWarning(warning: string | Error): void {
    console.warn(`(node) Warning: ${warning instanceof Error ? warning.message : warning}`);
  }

  kill(pid: number, signal = 'SIGTERM'): true {
    if (pid === this.pid) {
      this.emit(signal, signal);
    }
    return true;
  }

  hrtime = Object.assign(
    (previous?: [number, number]): [number, number] => {
      const nanoseconds = BigInt(Math.round(performance.now() * 1e6));
      const seconds = Number(nanoseconds / 1_000_000_000n);
      const rest = Number(nanoseconds % 1_000_000_000n);
      if (!previous) {
        return [seconds, rest];
      }
      const diff = seconds * 1e9 + rest - (previous[0] * 1e9 + previous[1]);
      return [Math.floor(diff / 1e9), diff % 1e9];
    },
    { bigint: () => BigInt(Math.round(performance.now() * 1e6)) },
  );

  reset(): void {
    this.removeAllListeners();
    Object.keys(this.env).forEach((name) => delete this.env[name]);
    Object.assign(this.env, INITIAL_ENV);
    this.argv.splice(0, this.argv.length, ...INITIAL_ARGV);
    this.exitCode = undefined;
    this.directory = '/app';
    tickQueue = [];
  }
}

export const process = new NodeProcess();
