import asyncio


class ReadThroughCache:
    def __init__(self, *, load, ttl_ms, now):
        self._load = load
        self._ttl_ms = ttl_ms
        self._now = now
        self._entries = {}
        self._hits = 0
        self._misses = 0

    async def get(self, key):
        entry = self._entries.get(key)
        if entry is not None and self._now() < entry["expires_at"]:
            self._hits += 1
            return entry["value"]
        self._misses += 1
        self._entries.pop(key, None)
        value = await self._load(key)
        self._entries[key] = {"value": value, "expires_at": self._now() + self._ttl_ms}
        return value

    def invalidate(self, key):
        self._entries.pop(key, None)

    def stats(self):
        lookups = self._hits + self._misses
        hit_ratio = self._hits / lookups if lookups else 0
        return {"hits": self._hits, "misses": self._misses, "hit_ratio": hit_ratio}


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
