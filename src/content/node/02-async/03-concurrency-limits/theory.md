# Concurrency Limits

`Promise.all(items.map(work))` starts **every** operation immediately. With ten items that is great; with ten thousand it opens ten thousand sockets or database queries at once. Real backends sit in front of resources with hard limits: a database pool of 10–20 connections, an API that allows 5 concurrent requests per key, a disk, a CPU. A **concurrency limit** keeps at most N operations in flight and starts the next one as soon as a slot frees up.

## What goes wrong without a limit

| Symptom | Cause |
| --- | --- |
| `429 Too Many Requests` from a partner API | You exceeded its rate or concurrency limit |
| Timeouts waiting for a database connection | 5 000 queries queue for a pool of 10 |
| `EMFILE: too many open files` | Thousands of files or sockets opened at once |
| Memory spikes | Every response body is in memory simultaneously |
| Other users' requests get slow | One export job saturates shared resources |

Running everything sequentially (`for ... of` with `await`) avoids the overload but wastes time: one slow item blocks the rest.

## Batches vs a pool

The tempting fix is batching: split into chunks of N and `Promise.all` each chunk.

```ts
for (let start = 0; start < ids.length; start += 5) {
  await Promise.all(ids.slice(start, start + 5).map(fetchUser));
}
```

It respects the limit, but every batch waits for its **slowest** item while the other four slots sit idle. A **pool** keeps all slots busy: N workers each pull the next item from a shared index whenever they finish one.

```ts
async function runPool(tasks: Array<() => Promise<void>>, limit: number) {
  let next = 0;
  async function worker() {
    while (next < tasks.length) {
      const task = tasks[next++];
      await task();
    }
  }
  await Promise.all(Array.from({ length: limit }, () => worker()));
}
```

Because JavaScript is single-threaded, `next++` needs no lock: no other code can run between reading and incrementing it. Each worker is just an async loop; `Promise.all` waits for every worker to drain the list.

## Design decisions in a real helper

- **Result order**: store each result at its input index, so the output matches the input no matter which item finishes first.
- **Errors**: either fail fast (reject on the first error and stop starting new items) or collect every outcome like `allSettled`. Items already in flight cannot be stopped without an `AbortSignal`.
- **Validation**: a limit of `0` would never start anything and hang forever; reject it.
- **Limit size**: start from the bottleneck. A database pool of 10 shared by the whole app means a background job should use far fewer.

## The ecosystem

| Tool | Shape |
| --- | --- |
| `p-limit` | `const limit = pLimit(5); await Promise.all(ids.map((id) => limit(() => fetchUser(id))))` |
| `p-map` | `await pMap(ids, fetchUser, { concurrency: 5 })`, with `stopOnError` |
| `p-queue` | A long-lived queue with concurrency, priorities and rate limits (`intervalCap`) |
| Streams | `Readable.from(ids).map(fetchUser, { concurrency: 5 })` on Node's stream helpers |

A concurrency limit is not a rate limit: 5 concurrent requests that each take 10 ms is 500 requests per second. If a partner allows 100 per minute, you need rate limiting (covered in the security module) or a queue with an interval cap.

## Beyond one process

The limit lives in one process. Three instances of your service with a limit of 10 make 30 concurrent calls. For limits that must hold across instances, use a job queue (the scaling module) or a shared limiter such as Redis.

## When to choose it

Use a concurrency limit whenever the number of operations depends on data or user input: imports, exports, fan-out to other services, file processing. Prefer a single batched operation when the target supports it (`WHERE id IN (...)`, a bulk API endpoint): one round trip beats any amount of concurrency. Keep `Promise.all` for small, fixed sets. Use `p-limit`/`p-map` in production code rather than a hand-written pool unless you want zero dependencies; writing one, as here, is how you learn to review them.

## Working with AI

Tell the assistant the bottleneck: "the partner API allows 5 concurrent requests; the list can have 20 000 ids". When reviewing generated code, check:

- No unbounded `Promise.all` over data-sized lists.
- Batching with `Promise.all` per chunk is flagged as slower than a pool.
- The limit is configurable and smaller than the shared resource (pool size, API quota).
- Results keep input order when callers rely on it.
- The error policy is explicit: fail fast or collect results, and no new work starts after a fatal error.
- Concurrency is not confused with rate limiting.
