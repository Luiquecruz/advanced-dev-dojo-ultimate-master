export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  // TODO: reject with signal.reason when already aborted or aborted later (clear the timer); remove the listener on success
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function withTimeout<T>(task: (signal: AbortSignal) => Promise<T>, ms: number, parent?: AbortSignal): Promise<T> {
  // TODO: build a signal from AbortSignal.timeout(ms) (combined with parent through AbortSignal.any), pass it to the task and reject with signal.reason when it aborts
  return task(new AbortController().signal);
}

export function latestOnly<A, R>(task: (input: A, signal: AbortSignal) => Promise<R>): (input: A) => Promise<R> {
  // TODO: abort the previous call's controller every time a new call starts
  return (input) => task(input, new AbortController().signal);
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
