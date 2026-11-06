Build a cache-aside layer that survives a hot key expiring: concurrent misses share one load, expiries are spread with jitter, and failures are never cached. Time and randomness are injected so the tests control them.

```python
class CacheAside:
    def __init__(
        self,
        *,
        load: Callable[[str], Awaitable[object]],  # an async function: value = await load(key)
        ttl_ms: float,
        jitter_ms: float,
        now: Callable[[], float],                  # the time in milliseconds
        random: Callable[[], float],               # a float in [0, 1)
    ): ...
    async def get(self, key: str) -> object: ...
    def invalidate(self, key: str) -> None: ...
```

The tests create the cache with keyword arguments only and start several `get` calls as tasks before awaiting them.

- `get(key)` returns the cached value while the entry is fresh: `now() < expires_at`. Otherwise it is a miss: the `get` that misses calls `load(key)`, and the value comes from that load.
- **Request coalescing**: while a load for a key is in flight, every other `get` of that key waits for that same load instead of calling `load` again. A hundred concurrent misses on one key call `load` exactly once.
- When a load returns, store the value with `expires_at = now() + ttl_ms + math.floor(random() * jitter_ms)`, reading `now()` and calling `random()` once at that moment, and forget the in-flight load.
- When a load raises, every waiting `get` raises the same exception, nothing is stored and the in-flight load is forgotten, so the next `get` calls `load` again.
- `invalidate(key)` deletes the cached entry and forgets any in-flight load of that key: the next `get` starts a new load. A forgotten load still finishes for the callers already waiting on it, but it never touches the cache again: its value is never stored, even when it arrives after the newer load's value, and whether it returns or raises, it never clears the newer in-flight load, so later `get` calls keep sharing that one.
