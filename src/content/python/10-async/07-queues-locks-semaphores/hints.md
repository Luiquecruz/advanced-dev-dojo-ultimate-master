The producer is `for index, item in enumerate(items): await queue.put((index, item))`. Because `put` waits while the queue is full, the `for` loop pulls the next item only when there is room. Carry the index so the consumers can store each result in a dict and you can return them in item order.
---
Start the producer and the `workers` consumers in one `asyncio.TaskGroup`. After its last `put`, the producer calls `queue.shutdown()`; each consumer loops on `await queue.get()` and returns when it raises `asyncio.QueueShutDown`. The group then exits with every task finished.
---
For `limited_gather`, wrap each factory in a small coroutine that does `async with semaphore: return await factory()`, and start all of them. For `SafeCounter`, create `self._lock = asyncio.Lock()` in `__init__` and put both awaits of `increment` inside `async with self._lock:`.
