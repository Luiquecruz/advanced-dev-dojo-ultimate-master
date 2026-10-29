Keep two private fields: `cache = new Map<K, Promise<V>>()` and `queue` with `{ key, resolve, reject }` items. `load` checks the cache, creates a `new Promise` that pushes its `resolve`/`reject` into the queue, stores it in the cache and returns it.
---
Schedule the dispatch only for the first key of a batch: `if (this.queue.length === 1) queueMicrotask(() => this.dispatch())`. In `dispatch`, take the queue and reset it (`const queue = this.queue; this.queue = [];`) before calling `batch`, so loads made during the batch start a new one.
---
Wrap the batch call in `try/catch`: throw the length error inside the `try`, resolve or reject each item by index, and in `catch` reject every item. For the cache, register `promise.catch(() => this.cache.delete(key))` in `load`. In `getFeed`, build `new Map(rows.map((user) => [user.id, user]))` and return `ids.map((id) => byId.get(id) ?? null)`.
