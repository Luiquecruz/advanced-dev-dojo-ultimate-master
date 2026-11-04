asyncio ships its own coordination primitives. They look like the `threading` ones, but they suspend **the task** instead of blocking **the thread**:

- **`asyncio.Queue(maxsize=n)`**: `await queue.put(item)` waits while the queue is full, `await queue.get()` waits while it is empty. A bounded queue gives you **backpressure**: a fast producer slows down to the speed of its consumers.
- **`asyncio.Semaphore(n)`**: at most `n` holders at once; `async with semaphore:` waits for a free slot.
- **`asyncio.Lock()`**: one holder at a time, for a critical section that contains an `await`.

```py
import asyncio

async def producer(queue):
    for order in range(5):
        await queue.put(order)          # waits while two orders are already queued
        print("queued", order)
    queue.shutdown()                    # no more orders: consumers drain the rest, then stop

async def consumer(queue):
    while True:
        try:
            order = await queue.get()
        except asyncio.QueueShutDown:   # raised once the queue is shut down and empty
            return
        await asyncio.sleep(0.01)       # process the order

async def main():
    queue = asyncio.Queue(maxsize=2)
    async with asyncio.TaskGroup() as group:
        group.create_task(producer(queue))
        for _ in range(2):
            group.create_task(consumer(queue))

asyncio.run(main())
```

## Coming from TypeScript and JavaScript

The first habit is the array as a queue: `jobs.push(job)` on one side, `jobs.shift()` on the other. Nothing ever tells the producer to slow down, so a slow consumer turns into unbounded memory growth and ever older items. A plain `list` or an `asyncio.Queue()` without `maxsize` has the same flaw. Backpressure needs a bound, and a producer that **pulls the next item only when `put` returns**:

```ts
for await (const event of source) buffer.push(event);  // reads the whole source, whatever the consumers do
```

The second habit is "JavaScript is single-threaded, so there are no races". It is true **between** two awaits and false **across** one. Both runtimes interleave tasks at every `await`, so a read-modify-write that waits in the middle loses updates:

```py
async def increment(self):
    current = await self.store.read()    # task B reads the same value while A waits here
    await self.store.write(current + 1)  # A and B both write current + 1: one update is lost
```

Hold an `asyncio.Lock` from the read to the write. Concurrency limits, which JavaScript code gets from libraries such as `p-limit`, are a `Semaphore` in the standard library.

## How it works

- **`Queue.task_done()` and `Queue.join()`**: every `get` followed by `task_done()` lets `join()` return once every item put has been processed. The classic shutdown is `await queue.join()`, then cancel the consumers *and wait for them*.
- **`Queue.shutdown(immediate=False)`** (3.13): further `put` calls raise `QueueShutDown`; `get` keeps returning queued items and raises `QueueShutDown` once the queue is empty, so consumers end on their own. `immediate=True` drops the remaining items.
- **`Semaphore`** keeps a counter: `acquire` decrements it or waits at zero, `release` increments it. Acquire it **inside** each task, around the work. Acquiring it around `create_task` only limits how fast tasks are created, not how many run.
- **`Lock`** is not reentrant. Keep the critical section short; everything waiting for it is serialized.
- **None of these primitives are thread-safe**, and `threading.Lock` must never be held across an `await`: a second task trying to acquire it blocks the only thread, and with it the event loop.

> **Status as of November 2026:** `Queue.shutdown()` and `QueueShutDown` (Python 3.13) work in this sandbox (Pyodide, Python 3.14). On 3.12 and older, stop consumers with `join()` and cancellation, or with a sentinel item per consumer.

## When to choose it

- **A bounded `Queue` with a fixed number of worker tasks** for pipelines: the queue size bounds memory and item age, the worker count bounds concurrency.
- **A `Semaphore`** when tasks already exist (one per request, one per URL) and only the number running at once must be capped, for example to respect a rate limit or a connection pool.
- **A `Lock`** only when shared state is read and written across an `await`. If no `await` sits between the read and the write, the section is already atomic in asyncio.
- **Thread or process primitives** (`queue.Queue`, `threading.Lock`, `multiprocessing`) only for code that really runs on other threads or processes.
