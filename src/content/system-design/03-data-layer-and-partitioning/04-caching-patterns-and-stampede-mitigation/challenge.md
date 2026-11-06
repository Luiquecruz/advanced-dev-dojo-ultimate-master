Build a cache-aside layer that survives a hot key expiring: concurrent misses share one load, expiries are spread with jitter, and failures are never cached. Time and randomness are injected so the tests control them.

```ts
export function createCacheAside<V>(options: {
  load: (key: string) => Promise<V>;
  ttlMs: number;
  jitterMs: number;
  now: () => number;
  random: () => number;
}): {
  get(key: string): Promise<V>;
  invalidate(key: string): void;
}
```

- `get(key)` resolves with the cached value while the entry is fresh: `now() < expiresAt`. Otherwise it is a miss: the `get` call that misses calls `load(key)` right away, before it returns, and the value comes from that load.
- **Request coalescing**: while a load for a key is in flight, every other `get` of that key returns the same pending promise instead of calling `load` again. A hundred concurrent misses on one key call `load` exactly once.
- When a load resolves, store the value with `expiresAt = now() + ttlMs + Math.floor(random() * jitterMs)`, reading `now()` and calling `random()` once at that moment, and forget the in-flight promise.
- When a load rejects, every waiting `get` rejects with the same error, nothing is stored and the in-flight promise is forgotten, so the next `get` calls `load` again.
- `invalidate(key)` deletes the cached entry and forgets any in-flight load of that key: the next `get` starts a new load. A forgotten load still settles for the callers already waiting on it, but it never touches the cache again: its value is never stored, even when it arrives after the newer load's value, and whether it resolves or rejects, it never clears the newer in-flight load, so later `get` calls keep sharing that one.
