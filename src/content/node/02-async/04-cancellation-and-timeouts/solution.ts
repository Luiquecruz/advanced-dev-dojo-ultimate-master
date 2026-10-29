export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      return reject(signal.reason);
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal!.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export function withTimeout<T>(task: (signal: AbortSignal) => Promise<T>, ms: number, parent?: AbortSignal): Promise<T> {
  const timeout = AbortSignal.timeout(ms);
  const signal = parent ? AbortSignal.any([parent, timeout]) : timeout;
  return new Promise<T>((resolve, reject) => {
    if (signal.aborted) {
      return reject(signal.reason);
    }
    const onAbort = () => reject(signal.reason);
    signal.addEventListener('abort', onAbort, { once: true });
    task(signal)
      .then(resolve, reject)
      .finally(() => signal.removeEventListener('abort', onAbort));
  });
}

export function latestOnly<A, R>(task: (input: A, signal: AbortSignal) => Promise<R>): (input: A) => Promise<R> {
  let current: AbortController | undefined;
  return (input) => {
    current?.abort();
    current = new AbortController();
    return task(input, current.signal);
  };
}

async function main() {
  try {
    await withTimeout((signal) => sleep(500, signal), 50);
  } catch (error) {
    console.log(`slow task: ${(error as Error).name}`);
  }
  console.log(`fast task: ${await withTimeout(async () => 'done', 50)}`);
}

main();
