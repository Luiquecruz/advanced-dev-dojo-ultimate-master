The starter stores bare values, so it has no way to know when one is too old and keeps serving it forever. Store an entry dict instead: `{"value": value, "expires_at": ...}`.
---
A lookup is a hit only when the entry exists **and** `self._now() < entry["expires_at"]`. Everything else goes down the miss path: count the miss first, then `value = await self._load(key)`. If that raises, the line that stores the entry never runs, so nothing is cached.
---
After a successful load, store `{"value": value, "expires_at": self._now() + self._ttl_ms}` under the key. `invalidate` is `self._entries.pop(key, None)`, which ignores a key that is not cached, and `stats` computes `lookups = self._hits + self._misses` and returns `"hit_ratio": self._hits / lookups if lookups else 0`.
