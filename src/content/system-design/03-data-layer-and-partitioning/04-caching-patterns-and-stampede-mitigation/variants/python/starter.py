import asyncio
import math
import random


class CacheAside:
    def __init__(self, *, load, ttl_ms, jitter_ms, now, random):
        self._load = load
        self._ttl_ms = ttl_ms
        self._jitter_ms = jitter_ms
        self._now = now
        self._random = random
        self._entries = {}

    async def get(self, key):
        entry = self._entries.get(key)
        if entry is not None and self._now() < entry["expires_at"]:
            return entry["value"]
        # TODO: share one in-flight load per key between concurrent misses, and forget it when it finishes
        value = await self._load(key)
        # TODO: add math.floor(random() * jitter_ms) to the expiry
        self._entries[key] = {"value": value, "expires_at": self._now() + self._ttl_ms}
        return value

    def invalidate(self, key):
        # TODO: delete the entry and forget the in-flight load of this key
        pass


async def main():
    clock = 0

    async def load(key):
        return f"profile of {key}"

    cache = CacheAside(load=load, ttl_ms=60_000, jitter_ms=5_000, now=lambda: clock, random=random.random)
    first, second = await asyncio.gather(cache.get("user:1"), cache.get("user:1"))
    clock += 1_000
    print(first, second, await cache.get("user:1"))


if __name__ == "__main__":
    asyncio.run(main())
