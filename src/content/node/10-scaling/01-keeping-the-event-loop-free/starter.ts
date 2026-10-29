import type { IncomingMessage, RequestListener, ServerResponse } from 'node:http';
import { setImmediate } from 'node:timers/promises';

export interface ChunkOptions {
  chunkSize?: number;
  yieldToLoop?: () => Promise<void>;
}

export async function processInChunks<T, R>(
  items: readonly T[],
  worker: (item: T, index: number) => R,
  { chunkSize = 500, yieldToLoop = () => setImmediate() }: ChunkOptions = {},
): Promise<R[]> {
  // TODO: process chunkSize items at a time and await yieldToLoop() between chunks
  return items.map(worker);
}

export interface LagMonitor {
  maxLag(): number;
  samples(): number[];
  stop(): void;
}

export function monitorEventLoopLag(intervalMs: number, now: () => number = () => performance.now()): LagMonitor {
  const lags: number[] = [];
  // TODO: setInterval that records how late each tick fired, unref() it, and expose maxLag/samples/stop
  return {
    maxLag: () => 0,
    samples: () => [...lags],
    stop: () => {},
  };
}

export function shedLoad(handler: RequestListener, options: { maxLagMs: number; currentLag: () => number }): RequestListener {
  return (req: IncomingMessage, res: ServerResponse) => {
    // TODO: answer 503 { error: 'Server overloaded' } with Retry-After: 1 when the lag is above maxLagMs
    handler(req, res);
  };
}

async function main() {
  const monitor = monitorEventLoopLag(10);
  const blockedUntil = Date.now() + 50;
  while (Date.now() < blockedUntil) {}
  const squares = await processInChunks(Array.from({ length: 2_000 }, (_, index) => index), (value) => value * value, { chunkSize: 250 });
  await setImmediate();
  await new Promise((resolve) => setTimeout(resolve, 30));
  console.log(`Processed ${squares.length} items, max lag ${monitor.maxLag().toFixed(0)} ms`);
  monitor.stop();
}

main();
