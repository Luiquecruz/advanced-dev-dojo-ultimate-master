Write a read-through cache with a time-to-live and hit statistics. The cache sits in front of a source of truth: `load(key)` stands for a database query, and the cache is only a copy of what it returns. Time is injected with `now()` (milliseconds), so the tests move the clock instead of waiting.

```csharp
public record CacheStats(int Hits, int Misses, double HitRatio);

public class ReadThroughCache<TValue>(Func<string, Task<TValue>> load, long ttlMs, Func<long> now)
{
    public Task<TValue> GetAsync(string key);
    public void Invalidate(string key);
    public CacheStats Stats();
}
```

The tests create the cache with named arguments, `new ReadThroughCache<string>(load: database.LoadAsync, ttlMs: 1_000, now: () => clock.Now)`, and `await cache.GetAsync(key)`.

- `GetAsync(key)` returns the cached value while it is fresh: a value stored at time `t` (the value of `now()` when the load finished) is fresh while `now() < t + ttlMs`. That is a **hit**, and `load` is not called.
- Otherwise (never loaded, expired or invalidated) it is a **miss**: `GetAsync` awaits `load(key)` once, stores the result with its new expiry and returns it.
- When `load` fails, `GetAsync` fails with the same exception. The lookup still counts as a miss, and nothing is stored, so the next `GetAsync` calls `load` again.
- `Invalidate(key)` removes the key, so its next `GetAsync` is a miss. Other keys are not affected, and a key that is not cached is ignored.
- `Stats()` returns `new CacheStats(hits, misses, hitRatio)`, where `hitRatio` is `hits / (hits + misses)` as a `double`, or `0` before the first lookup.

Lookups in the tests run one after another; you do not need to handle two `GetAsync` calls for the same key at the same time.
