Build three coordination helpers in `main.py`. A **handler** is an async function that takes one item and returns its result; a **factory** is an async function with no parameters.

## `run_pipeline(items, handler, workers, queue_size)`

`items` is any iterable, possibly a lazy generator. Process every item with `handler` through an `asyncio.Queue(maxsize=queue_size)`:

- a producer task pulls items from `items` **one at a time** and puts them in the queue, so it pulls the next item only when the previous one fit in the queue (backpressure);
- `workers` consumer tasks take items from the queue and await `handler(item)`, so at most `workers` handlers run at once, and with enough items exactly `workers`.

Return the list of results **in the order of `items`**. When `run_pipeline` returns, every item has been handled exactly once and no producer or consumer task is still running. `queue_size` is at least 1. Stop the consumers with `Queue.shutdown()` (Python 3.13) or with `join()` followed by cancelling and awaiting them.

## `limited_gather(factories, limit)`

Run every factory concurrently, with **at most `limit` running at the same time** (and exactly `limit` while enough are waiting), using an `asyncio.Semaphore`. Return the results in the order of `factories`.

## `SafeCounter(store)`

`store` keeps the counter remotely: `await store.read()` returns the current value and `await store.write(value)` saves a new one; each call waits for a round trip. `await counter.increment()` reads the value, writes the value plus one and returns the new value.

Many increments run at the same time. Every one of them must read once and write once, and no update may be lost: after 50 concurrent increments the store holds 50 and the increments returned 1 to 50. Use one `asyncio.Lock` per counter.
