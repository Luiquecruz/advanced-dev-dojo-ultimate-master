import asyncio


class ReadThroughCache:
    def __init__(self, *, load, ttl_ms, now):
        self._load = load
        self._ttl_ms = ttl_ms
        self._now = now
        # TODO: store when each entry expires, so the source of truth is read again after ttl_ms
        self._entries = {}
        self._hits = 0
        self._misses = 0

    async def get(self, key):
        if key in self._entries:
            self._hits += 1
            return self._entries[key]
        self._misses += 1
        value = await self._load(key)
        self._entries[key] = value
        return value

    def invalidate(self, key):
        # TODO: forget the cached value so the next get loads it again
        pass

    def stats(self):
        # TODO: hit_ratio is hits / (hits + misses), or 0 before any lookup
        return {"hits": self._hits, "misses": self._misses, "hit_ratio": 0}


async def main():
    clock = 0
    database = {"product:1": "Keyboard 120"}

    async def load(key):
        return database.get(key, "not found")

    cache = ReadThroughCache(load=load, ttl_ms=60_000, now=lambda: clock)
    print(await cache.get("product:1"))
    print(await cache.get("product:1"))
    database["product:1"] = "Keyboard 99"
    clock = 60_000
    print(await cache.get("product:1"))
    print(cache.stats())


if __name__ == "__main__":
    asyncio.run(main())
