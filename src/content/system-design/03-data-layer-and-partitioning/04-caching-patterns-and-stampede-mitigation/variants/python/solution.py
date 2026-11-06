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
        self._in_flight = {}

    async def get(self, key):
        entry = self._entries.get(key)
        if entry is not None and self._now() < entry["expires_at"]:
            return entry["value"]
        loading = self._in_flight.get(key)
        if loading is None:
            loading = asyncio.ensure_future(self._load(key))
            loading.add_done_callback(lambda done: self._finish(key, done))
            self._in_flight[key] = loading
        return await asyncio.shield(loading)

    def invalidate(self, key):
        self._entries.pop(key, None)
        self._in_flight.pop(key, None)

    def _finish(self, key, loading):
        if self._in_flight.get(key) is not loading:
            return
        del self._in_flight[key]
        if loading.cancelled() or loading.exception() is not None:
            return
        jitter = math.floor(self._random() * self._jitter_ms)
        self._entries[key] = {"value": loading.result(), "expires_at": self._now() + self._ttl_ms + jitter}


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
