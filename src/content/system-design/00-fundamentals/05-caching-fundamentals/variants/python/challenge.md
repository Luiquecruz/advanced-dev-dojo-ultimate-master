Write a read-through cache with a time-to-live and hit statistics. The cache sits in front of a source of truth: `load(key)` stands for a database query, and the cache is only a copy of what it returns. Time is injected with `now()` (milliseconds), so the tests move the clock instead of waiting.

```python
class ReadThroughCache:
    def __init__(self, *, load, ttl_ms, now): ...  # load is an async function: value = await load(key)
    async def get(self, key): ...
    def invalidate(self, key) -> None: ...
    def stats(self) -> dict: ...                   # {"hits": ..., "misses": ..., "hit_ratio": ...}
```

The tests create the cache with keyword arguments, `ReadThroughCache(load=database.load, ttl_ms=1_000, now=clock.now)`, and `await cache.get(key)`.

- `get(key)` returns the cached value while it is fresh: a value stored at time `t` (the value of `now()` when the load finished) is fresh while `now() < t + ttl_ms`. That is a **hit**, and `load` is not called.
- Otherwise (never loaded, expired or invalidated) it is a **miss**: `get` awaits `load(key)` once, stores the result with its new expiry and returns it.
- When `load` raises, `get` raises the same error. The lookup still counts as a miss, and nothing is stored, so the next `get` calls `load` again.
- `invalidate(key)` removes the key, so its next `get` is a miss. Other keys are not affected, and a key that is not cached is ignored.
- `stats()` returns `{"hits": ..., "misses": ..., "hit_ratio": ...}`, where `"hit_ratio"` is `hits / (hits + misses)`, or `0` before the first lookup.

Lookups in the tests run one after another; you do not need to handle two `get` calls for the same key at the same time.
