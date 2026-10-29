Keep a reporting endpoint responsive while it crunches data, and protect the process when it falls behind.

## 1. `processInChunks(items, worker, options?)`

```ts
processInChunks<T, R>(
  items: readonly T[],
  worker: (item: T, index: number) => R,
  options?: { chunkSize?: number; yieldToLoop?: () => Promise<void> },
): Promise<R[]>
```

- Calls `worker(item, index)` for every item in order and resolves with the results in order.
- Processes `chunkSize` items (default `500`) synchronously, then awaits `yieldToLoop()` before the next chunk. It awaits it **after every chunk except the last** (10 items with `chunkSize: 3` yield 3 times; an empty array or a single chunk never yields).
- The default `yieldToLoop` must give the event loop a real turn: use `setImmediate` from `node:timers/promises` (a resolved promise is not enough).

## 2. `monitorEventLoopLag(intervalMs, now?)`

Returns `{ maxLag(): number; samples(): number[]; stop(): void }`.

- Uses `setInterval` every `intervalMs`. Each tick records `Math.max(0, now() - expected)` where `expected` is the time the tick should have fired (the previous tick time, or the start time, plus `intervalMs`).
- `now` defaults to `() => performance.now()`.
- `samples()` returns the recorded lags, `maxLag()` the largest one (`0` before any sample), `stop()` clears the interval.
- The interval must be `unref()`'d so the monitor never keeps the process alive.

## 3. `shedLoad(handler, { maxLagMs, currentLag })`

Wraps a `node:http` request listener. When `currentLag()` is greater than `maxLagMs`, answer `503` with header `Retry-After: 1`, `Content-Type: application/json` and body `{ "error": "Server overloaded" }` without calling `handler`. Otherwise call `handler(req, res)`.
