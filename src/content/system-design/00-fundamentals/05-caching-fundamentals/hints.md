The starter stores bare values, so it has no way to know when one is too old and keeps serving it forever. Store an entry object instead: `{ value, expiresAt }`.
---
A lookup is a hit only when the entry exists **and** `options.now() < entry.expiresAt`. Everything else goes down the miss path: count the miss first, then `await options.load(key)`. If that throws, the `set` below it never runs, so nothing is cached.
---
After a successful load, `entries.set(key, { value, expiresAt: options.now() + options.ttlMs })`. `invalidate` is `entries.delete(key)`, and `stats` computes `const lookups = hits + misses` and returns `hitRatio: lookups === 0 ? 0 : hits / lookups`.
