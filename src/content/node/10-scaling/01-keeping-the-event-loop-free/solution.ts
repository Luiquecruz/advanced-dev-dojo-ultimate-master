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
  const results: R[] = [];
  for (let start = 0; start < items.length; start += chunkSize) {
    const end = Math.min(start + chunkSize, items.length);
    for (let index = start; index < end; index++) {
      results.push(worker(items[index], index));
    }
    if (end < items.length) {
      await yieldToLoop();
    }
  }
  return results;
}

export interface LagMonitor {
  maxLag(): number;
  samples(): number[];
  stop(): void;
}

export function monitorEventLoopLag(intervalMs: number, now: () => number = () => performance.now()): LagMonitor {
  const lags: number[] = [];
  let expected = now() + intervalMs;
  const timer = setInterval(() => {
    const current = now();
    lags.push(Math.max(0, current - expected));
    expected = current + intervalMs;
  }, intervalMs);
  timer.unref();
  return {
    maxLag: () => lags.reduce((max, lag) => Math.max(max, lag), 0),
    samples: () => [...lags],
    stop: () => clearInterval(timer),
  };
}

export function shedLoad(handler: RequestListener, options: { maxLagMs: number; currentLag: () => number }): RequestListener {
  return (req: IncomingMessage, res: ServerResponse) => {
    if (options.currentLag() > options.maxLagMs) {
      res.writeHead(503, { 'Content-Type': 'application/json', 'Retry-After': '1' });
      res.end(JSON.stringify({ error: 'Server overloaded' }));
      return;
    }
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
