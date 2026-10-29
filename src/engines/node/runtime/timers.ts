type Callback = (...args: any[]) => void;

const active = new Set<Timeout>();

/**
 * Node-style timer handle with ref/unref, tracked so the runtime knows when the event loop is empty.
 */
export class Timeout {
  private id: ReturnType<typeof globalThis.setTimeout> | undefined;
  private referenced = true;

  constructor(
    private readonly callback: Callback,
    private readonly delay: number,
    private readonly args: unknown[],
    private readonly repeat: boolean,
  ) {
    this.schedule();
  }

  private schedule(): void {
    active.add(this);
    const run = () => {
      if (!this.repeat) {
        active.delete(this);
      }
      this.callback(...this.args);
    };
    this.id = this.repeat ? globalThis.setInterval(run, this.delay) : globalThis.setTimeout(run, this.delay);
  }

  clear(): void {
    active.delete(this);
    globalThis.clearTimeout(this.id);
    globalThis.clearInterval(this.id);
  }

  ref(): this {
    this.referenced = true;
    return this;
  }

  unref(): this {
    this.referenced = false;
    return this;
  }

  hasRef(): boolean {
    return this.referenced;
  }

  refresh(): this {
    this.clear();
    this.schedule();
    return this;
  }

  get pending(): boolean {
    return active.has(this) && this.referenced;
  }

  [Symbol.toPrimitive](): number {
    return Number(this.id);
  }
}

/**
 * Node-style handle returned by setImmediate.
 */
export class Immediate extends Timeout {}

function clear(handle: unknown): void {
  if (handle instanceof Timeout) {
    handle.clear();
    return;
  }
  globalThis.clearTimeout(handle as number);
}

export const setTimeout = (callback: Callback, delay = 0, ...args: unknown[]) => new Timeout(callback, Math.max(1, delay), args, false);
export const setInterval = (callback: Callback, delay = 0, ...args: unknown[]) => new Timeout(callback, Math.max(1, delay), args, true);
export const setImmediate = (callback: Callback, ...args: unknown[]) => new Immediate(callback, 0, args, false);
export const clearTimeout = clear;
export const clearInterval = clear;
export const clearImmediate = clear;

/**
 * Whether a referenced timer is still waiting to fire.
 */
export function hasPendingTimers(): boolean {
  return [...active].some((timer) => timer.pending);
}

/**
 * Cancels every timer created through the runtime.
 */
export function clearAllTimers(): void {
  [...active].forEach((timer) => timer.clear());
}

function abortable<T>(signal: AbortSignal | undefined, start: (resolve: (value: T) => void) => Timeout): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new DOMException('The operation was aborted', 'AbortError'));
      return;
    }
    const timer = start(resolve);
    signal?.addEventListener('abort', () => {
      timer.clear();
      reject(signal.reason ?? new DOMException('The operation was aborted', 'AbortError'));
    });
  });
}

export const promises = {
  setTimeout: <T = void>(delay = 0, value?: T, options: { signal?: AbortSignal; ref?: boolean } = {}) =>
    abortable<T>(options.signal, (resolve) => {
      const timer = setTimeout(() => resolve(value as T), delay);
      return options.ref === false ? timer.unref() : timer;
    }),
  setImmediate: <T = void>(value?: T, options: { signal?: AbortSignal } = {}) =>
    abortable<T>(options.signal, (resolve) => setImmediate(() => resolve(value as T))),
  scheduler: {
    wait: (delay: number, options: { signal?: AbortSignal } = {}) => abortable<void>(options.signal, (resolve) => setTimeout(() => resolve(), delay)),
    yield: () => new Promise<void>((resolve) => setImmediate(resolve)),
  },
};
