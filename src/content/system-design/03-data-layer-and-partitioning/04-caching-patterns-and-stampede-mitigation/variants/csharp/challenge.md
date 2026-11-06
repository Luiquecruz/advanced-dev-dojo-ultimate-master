Build a cache-aside layer that survives a hot key expiring: concurrent misses share one load, expiries are spread with jitter, and failures are never cached. Time and randomness are injected so the tests control them.

```csharp
public class CacheAside<TValue>
{
    public CacheAside(
        Func<string, Task<TValue>> load, // the slow source, for example a database query
        long ttlMs,
        long jitterMs,
        Func<long> now,                  // the time in milliseconds
        Func<double> random);            // a double in [0, 1)
    public Task<TValue> GetAsync(string key);
    public void Invalidate(string key);
}
```

The tests create the cache with named arguments (`new CacheAside<string>(load: …, ttlMs: 1000, jitterMs: 500, now: …, random: …)`). Their `load` returns a task that is already complete, or a `TaskCompletionSource` task they complete by hand later, and they start several `GetAsync` calls before awaiting them.

- `GetAsync(key)` returns the cached value while the entry is fresh: `now() < expiresAt`. Otherwise it is a miss: the `GetAsync` call that misses calls `load(key)` right away, before it returns, and the value comes from that load.
- **Request coalescing**: while a load for a key is in flight, every other `GetAsync` of that key waits for that same load task instead of calling `load` again. A hundred concurrent misses on one key call `load` exactly once.
- When a load succeeds, store the value with `expiresAt = now() + ttlMs + (long)Math.Floor(random() * jitterMs)`, reading `now()` and calling `random()` once at that moment, and forget the in-flight load.
- When a load fails, every waiting `GetAsync` fails with the same exception, nothing is stored and the in-flight load is forgotten, so the next `GetAsync` calls `load` again.
- `Invalidate(key)` deletes the cached entry and forgets any in-flight load of that key: the next `GetAsync` starts a new load. A forgotten load still completes for the callers already waiting on it, but it never touches the cache again: its value is never stored, even when it arrives after the newer load's value, and whether it succeeds or fails, it never clears the newer in-flight load, so later `GetAsync` calls keep sharing that one.
