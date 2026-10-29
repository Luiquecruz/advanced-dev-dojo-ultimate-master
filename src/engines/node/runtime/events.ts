import EventEmitter from 'events/events.js';

/**
 * Async iterator over the events emitted with `name`, like `events.on()` in Node.
 */
export function on(emitter: EventEmitter, name: string, options: { signal?: AbortSignal } = {}): AsyncIterableIterator<unknown[]> {
  const queued: unknown[][] = [];
  const waiting: Array<{ resolve: (result: IteratorResult<unknown[]>) => void; reject: (error: unknown) => void }> = [];
  let failure: unknown;
  let finished = false;

  const listener = (...args: unknown[]) => {
    const next = waiting.shift();
    if (next) {
      next.resolve({ value: args, done: false });
    } else {
      queued.push(args);
    }
  };
  const errorListener = (error: unknown) => {
    finished = true;
    const next = waiting.shift();
    if (next) {
      next.reject(error);
    } else {
      failure = error;
    }
    cleanup();
  };
  const cleanup = () => {
    emitter.off(name, listener);
    if (name !== 'error') {
      emitter.off('error', errorListener);
    }
    waiting.splice(0).forEach((pending) => pending.resolve({ value: undefined, done: true }));
  };

  emitter.on(name, listener);
  if (name !== 'error') {
    emitter.on('error', errorListener);
  }
  options.signal?.addEventListener('abort', () => errorListener(options.signal!.reason ?? new DOMException('The operation was aborted', 'AbortError')));

  return {
    [Symbol.asyncIterator]() {
      return this;
    },
    next() {
      if (queued.length > 0) {
        return Promise.resolve({ value: queued.shift()!, done: false });
      }
      if (failure !== undefined) {
        const error = failure;
        failure = undefined;
        return Promise.reject(error);
      }
      if (finished) {
        return Promise.resolve({ value: undefined, done: true });
      }
      return new Promise((resolve, reject) => waiting.push({ resolve, reject }));
    },
    return() {
      finished = true;
      cleanup();
      return Promise.resolve({ value: undefined, done: true });
    },
  };
}

export const events = {
  default: EventEmitter,
  EventEmitter,
  once: EventEmitter.once,
  on,
  errorMonitor: Symbol('events.errorMonitor'),
  get defaultMaxListeners() {
    return EventEmitter.defaultMaxListeners;
  },
  listenerCount: (emitter: EventEmitter, name: string) => emitter.listenerCount(name),
};
