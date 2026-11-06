The starter stores bare values, so it has no way to know when one is too old and keeps serving it forever. Store an entry instead, for example a nested `private sealed record Entry(TValue Value, long ExpiresAt);`.
---
A lookup is a hit only when the entry exists **and** `now() < entry.ExpiresAt`. Everything else goes down the miss path: count the miss first, then `var value = await load(key);`. If that throws, the line that stores the entry never runs, so nothing is cached.
---
After a successful load, store `new Entry(value, now() + ttlMs)` under the key. `Invalidate` is `_entries.Remove(key)`, which returns `false` for a key that is not cached instead of throwing, and `Stats` computes `var lookups = _hits + _misses;` and uses `lookups == 0 ? 0 : (double)_hits / lookups` as the ratio: without the cast, dividing two `int` values gives `0`.
