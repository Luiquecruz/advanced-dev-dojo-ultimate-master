class Clock:
    def __init__(self):
        self.time = 0

    def now(self):
        return self.time


class Database:
    def __init__(self):
        self.rows = {"product:1": "Keyboard 120", "product:2": "Mouse 45"}
        self.calls = 0

    async def load(self, key):
        self.calls += 1
        if key not in self.rows:
            raise LookupError(f"no row for {key}")
        return self.rows[key]


def setup(ttl_ms=1000):
    clock = Clock()
    database = Database()
    cache = mod.ReadThroughCache(load=database.load, ttl_ms=ttl_ms, now=clock.now)
    return cache, database, clock


@test("the first get is a miss that calls load; later gets within the TTL are hits")
async def _():
    cache, database, _ = setup()
    stats = cache.stats()
    assert stats == {"hits": 0, "misses": 0, "hit_ratio": 0}
    values =[await cache.get("product:1"), await cache.get("product:1"), await cache.get("product:1"), await cache.get("product:2")]
    assert values == ["Keyboard 120", "Keyboard 120", "Keyboard 120", "Mouse 45"]
    assert database.calls == 2
    stats = cache.stats()
    assert stats == {"hits": 2, "misses": 2, "hit_ratio": 0.5}


# beginner mistake: treating the cache as the primary store, so a cached value is served forever and the source of truth is never read again
@test("an entry expires one TTL after it was stored, and the next get loads the new value from the source")
async def _():
    cache, database, clock = setup(ttl_ms=1000)
    clock.time = 2000
    await cache.get("product:1")
    database.rows["product:1"] = "Keyboard 99"
    clock.time = 2999
    before_expiry = await cache.get("product:1")
    assert before_expiry == "Keyboard 120"
    clock.time = 3000
    after_expiry = await cache.get("product:1")
    assert after_expiry == "Keyboard 99"
    assert database.calls == 2
    stats = cache.stats()
    assert stats == {"hits": 1, "misses": 2, "hit_ratio": 1 / 3}


@test("invalidate(key) makes the next get of that key a miss, and leaves other keys cached")
async def _():
    cache, database, _ = setup()
    await cache.get("product:1")
    await cache.get("product:2")
    database.rows["product:1"] = "Keyboard 99"
    cache.invalidate("product:1")
    values = [await cache.get("product:1"), await cache.get("product:2")]
    assert values == ["Keyboard 99", "Mouse 45"]
    assert database.calls == 3
    stats = cache.stats()
    assert (stats["hits"], stats["misses"]) == (1, 3)


@test("a failed load fails the get, counts as a miss and caches nothing")
async def _():
    cache, database, _ = setup()
    error = await capture_error(cache.get("product:9"))
    assert "no row for product:9" in str(error)
    database.rows["product:9"] = "Monitor 340"
    value = await cache.get("product:9")
    assert value == "Monitor 340"
    assert database.calls == 2
    stats = cache.stats()
    assert (stats["hits"], stats["misses"]) == (0, 2)
