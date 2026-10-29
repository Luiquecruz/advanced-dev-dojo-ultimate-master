# Keeping the Event Loop Free

A Node.js server runs your JavaScript on **one thread**. That is why it handles thousands of concurrent connections cheaply: while one request waits for the database, the thread serves others. It is also its biggest weakness: while your code runs a long synchronous computation, **nothing else happens**. No other request is answered, no timer fires, no health check responds. The browser equivalent is a long task that freezes the page; on a server it freezes every user at once.

## What blocks the loop

| Blocking work | Typical cost | Better option |
| --- | --- | --- |
| `JSON.parse`/`JSON.stringify` of a 50 MB payload | hundreds of ms | stream, paginate, limit body size |
| Sorting or aggregating 1 000 000 rows in memory | hundreds of ms | do it in the database |
| `crypto.pbkdf2Sync`, `bcrypt.hashSync`, `zlib.gzipSync` | 50–500 ms each | the async versions (they use the libuv thread pool) |
| `fs.readFileSync` in a request handler | disk latency | `fs/promises` |
| A regular expression with catastrophic backtracking | seconds, or forever | safe patterns, input length limits (ReDoS) |
| Image resizing, PDF generation, report building | seconds | a worker thread or a background job |

The rule of thumb: a request handler should not hold the thread for more than a few milliseconds at a time. 100 ms of CPU per request means at most 10 requests per second **for the whole process**.

## Option 1: chunk the work and yield

If the work is divisible (a loop over items), process a chunk, then **yield** so the event loop can run other callbacks, then continue:

```ts
import { setImmediate } from 'node:timers/promises';

async function processInChunks<T, R>(items: T[], worker: (item: T) => R, chunkSize = 500): Promise<R[]> {
  const results: R[] = [];
  for (let start = 0; start < items.length; start += chunkSize) {
    for (const item of items.slice(start, start + chunkSize)) results.push(worker(item));
    if (start + chunkSize < items.length) await setImmediate();
  }
  return results;
}
```

`await setImmediate()` schedules the continuation in the **check** phase, after pending I/O callbacks have run, so incoming requests get served between chunks. `await Promise.resolve()` does **not** work: microtasks run before the loop moves on, so the thread is still monopolized. The total CPU time is the same (slightly higher); what improves is **latency for everyone else**. Choose the chunk size so one chunk takes a few milliseconds.

This is the same idea as `scheduler.yield()` and `requestIdleCallback` on the frontend.

## Option 2: move the work off the main thread

When the work cannot be split, or is heavy enough to matter even when split, run it elsewhere: **worker threads** (same process, separate V8 isolate), a **separate service** or a **background job queue** (covered in the next lessons). Async APIs of `crypto`, `zlib` and `fs` already use libuv's thread pool for you.

## Measuring event loop lag

Event loop **lag** (or delay) is how late a timer fires compared to when it was scheduled. Schedule a timer every 10 ms; if it fires 80 ms late, something blocked the loop for about 80 ms.

```ts
let expected = performance.now() + 10;
const timer = setInterval(() => {
  const now = performance.now();
  const lag = Math.max(0, now - expected);
  expected = now + 10;
}, 10);
timer.unref();
```

`unref()` matters: a monitoring timer must not keep the process alive on its own (it would block a graceful shutdown). In real Node use the built-in histogram: `perf_hooks.monitorEventLoopDelay()` gives percentiles (`p50`, `p99`) with almost no overhead. Export the p99 as a metric and alert on it; a healthy API stays in single-digit milliseconds.

## Load shedding

When lag is high, the process is already behind: accepting more work makes every response slower and can end in timeouts across the board. **Load shedding** answers `503 Service Unavailable` with a `Retry-After` header immediately, so load balancers and clients back off while the backlog drains. Fastify's `@fastify/under-pressure` does exactly this with lag, heap and RSS thresholds. Exempt health and readiness endpoints according to how your orchestrator interprets them.

## When to choose it

| Situation | Approach |
| --- | --- |
| Occasional loop over a few thousand items | nothing; it is fast enough |
| Divisible CPU work inside a request (tens of ms) | chunk and yield with `setImmediate` |
| Heavy CPU work per request (hashing, images, parsing big files) | async built-ins, worker threads or a separate service |
| Work the user does not wait for | a background job queue |
| Spikes beyond capacity | load shedding plus horizontal scaling |

Chunking adds complexity and does not add capacity: it only keeps latency fair. If CPU is the bottleneck, you need more threads, more processes or less work (caching, moving aggregation to the database).

## Working with AI

Generated code often uses `*Sync` APIs, giant `JSON.parse` calls and in-memory aggregation without thinking about the loop. Ask "which parts of this handler are CPU-bound, and how long do they block the event loop for N items?". Review for:

- `readFileSync`, `pbkdf2Sync`, `gzipSync` or similar inside request handlers.
- Loops over unbounded input with no chunking, limits or pagination.
- Yielding with `await Promise.resolve()` or `process.nextTick` (they do not let I/O run).
- Monitoring timers without `unref()`.
- User-controlled input fed to complex regular expressions.
- No event loop lag metric in production.
