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

## How it works

- **Backpressure needs a bound.** A plain `list` used as a buffer, or an `asyncio.Queue()` without `maxsize`, never tells the producer to slow down, so a slow consumer turns into unbounded memory growth and ever older items. Bound the queue, and let the producer **pull the next item only when `put` returns**.
- **`Queue.task_done()` and `Queue.join()`**: every `get` followed by `task_done()` lets `join()` return once every item put has been processed. The classic shutdown is `await queue.join()`, then cancel the consumers *and wait for them*.
- **`Queue.shutdown(immediate=False)`** (3.13): further `put` calls raise `QueueShutDown`; `get` keeps returning queued items and raises `QueueShutDown` once the queue is empty, so consumers end on their own. `immediate=True` drops the remaining items.
- **`Semaphore`** keeps a counter: `acquire` decrements it or waits at zero, `release` increments it. Acquire it **inside** each task, around the work. Acquiring it around `create_task` only limits how fast tasks are created, not how many run. `asyncio.BoundedSemaphore` behaves the same but raises `ValueError` when it is released more times than it was acquired, which turns a stray `release()` into an error instead of a silently higher limit.
- **`Lock`** is not reentrant. Keep the critical section short; everything waiting for it is serialized.
- **None of these primitives are thread-safe**, and `threading.Lock` must never be held across an `await`: a second task trying to acquire it blocks the only thread, and with it the event loop.

## Common mistakes

**A read-modify-write with an `await` in the middle, and no lock.** One thread does not mean no races: code between two awaits runs without interruption, but every `await` lets another task run. Two increments that both read before either writes lose an update.

```py
# wrong: task B reads the same value while A waits for its write
async def increment(self):
    current = await self.store.read()
    await self.store.write(current + 1)    # A and B both write current + 1

# right: the lock covers the read and the write
async def increment(self):
    async with self._lock:                 # self._lock = asyncio.Lock() in __init__
        current = await self.store.read()
        await self.store.write(current + 1)
```

Acquiring a `Semaphore` around `create_task` instead of around the work is the second slip: it only slows down task creation.

> **Status as of November 2026:** `Queue.shutdown()` and `QueueShutDown` (Python 3.13) work in this sandbox (Pyodide, Python 3.14). On 3.12 and older, stop consumers with `join()` and cancellation, or with a sentinel item per consumer.

## When to choose it

- **A bounded `Queue` with a fixed number of worker tasks** for pipelines: the queue size bounds memory and item age, the worker count bounds concurrency.
- **A `Semaphore`** when tasks already exist (one per request, one per URL) and only the number running at once must be capped, for example to respect a rate limit or a connection pool.
- **A `Lock`** only when shared state is read and written across an `await`. If no `await` sits between the read and the write, the section is already atomic in asyncio.
- **Thread or process primitives** (`queue.Queue`, `threading.Lock`, `multiprocessing`) only for code that really runs on other threads or processes.
