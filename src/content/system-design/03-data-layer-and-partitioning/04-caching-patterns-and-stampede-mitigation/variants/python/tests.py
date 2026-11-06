import asyncio


class Clock:
    def __init__(self):
        self.now = 0


class Load:
    """The `load` given to the cache: an async function that records every key it is called with.

    It answers f"{key}@{clock.now}", unless a future was queued with `answer_next` (the oldest is used first) or every
    call waits for the same `gate` future.
    """

    def __init__(self, clock, gate=None):
        self.clock = clock
        self.gate = gate
        self.queued = []
        self.calls = []

    def answer_next(self, future):
        self.queued.append(future)

    async def __call__(self, key):
        self.calls.append(key)
        if self.queued:
            return await self.queued.pop(0)
        if self.gate is not None:
            return await self.gate
        return f"{key}@{self.clock.now}"


def setup(ttl_ms=1000, jitter_ms=500, randoms=(0.5,), gate=None):
    clock = Clock()
    randoms = list(randoms)
    load = Load(clock, gate)
    cache = mod.CacheAside(
        load=load,
        ttl_ms=ttl_ms,
        jitter_ms=jitter_ms,
        now=lambda: clock.now,
        random=lambda: randoms.pop(0) if len(randoms) > 1 else randoms[0],
    )
    return clock, load, cache


def deferred():
    """A future that the test finishes by hand with set_result or set_exception."""
    return asyncio.get_running_loop().create_future()


async def ticks(count=5):
    """Lets every task that is ready run until it waits, `count` times in a row."""
    for _ in range(count):
        await asyncio.sleep(0)


async def started(coroutine):
    """Runs the coroutine as a task until it waits, like a caller that keeps a pending call to await later."""
    task = asyncio.ensure_future(coroutine)
    await ticks()
    return task


@test("a miss loads the key, and the value is served from the cache until its jittered expiry")
async def _():
    clock, load, cache = setup(ttl_ms=1000, jitter_ms=500, randoms=[0.5])
    first = await cache.get("user:1")
    assert first == "user:1@0"
    assert load.calls == ["user:1"]
    clock.now = 1249
    cached = await cache.get("user:1")
    assert cached == "user:1@0"
    assert load.calls == ["user:1"]
    clock.now = 1250
    reloaded = await cache.get("user:1")
    assert reloaded == "user:1@1250"
    other = await cache.get("user:2")
    assert other == "user:2@1250"
    assert len(load.calls) == 3


# beginner mistake: every concurrent miss calls load, so a hot key expiring stampedes the database
@test("100 concurrent gets on a cold key call load exactly once and share its value")
async def _():
    gate = deferred()
    _, load, cache = setup(gate=gate)
    pending = [asyncio.ensure_future(cache.get("product:7")) for _ in range(100)]
    await ticks()
    assert len(load.calls) == 1
    gate.set_result("keyboard")
    values = await asyncio.gather(*pending)
    assert values == ["keyboard"] * 100
    cached = await cache.get("product:7")
    assert cached == "keyboard"
    assert len(load.calls) == 1


@test("a rejected load fails every waiting get, is not cached, and the next get retries")
async def _():
    _, load, cache = setup()
    failure = deferred()
    load.answer_next(failure)
    waiting = [asyncio.ensure_future(cache.get("user:1")) for _ in range(3)]
    await ticks()
    failure.set_exception(ConnectionError("database timeout"))
    for task in waiting:
        error = await capture_error(task)
        assert str(error) == "database timeout"
    assert len(load.calls) == 1
    retried = await cache.get("user:1")
    assert retried == "user:1@0"
    assert len(load.calls) == 2


@test("jitter gives entries loaded together different expiry times")
async def _():
    clock, load, cache = setup(ttl_ms=1000, jitter_ms=500, randoms=[0, 0.999])
    await cache.get("a")
    await cache.get("b")
    clock.now = 1000
    a = await cache.get("a")
    assert a == "a@1000"
    b = await cache.get("b")
    assert b == "b@0"
    clock.now = 1499
    b = await cache.get("b")
    assert b == "b@1499"
    assert len(load.calls) == 4


@test("invalidate drops the cached value and the in-flight load, whose late result is never stored")
async def _():
    clock, load, cache = setup()
    first = await cache.get("user:1")
    assert first == "user:1@0"
    clock.now = 10
    cache.invalidate("user:1")
    reloaded = await cache.get("user:1")
    assert reloaded == "user:1@10"
    assert len(load.calls) == 2

    slow = deferred()
    load.answer_next(slow)
    stale = await started(cache.get("user:2"))
    cache.invalidate("user:2")
    fresh = await started(cache.get("user:2"))
    assert len(load.calls) == 4
    fresh_value = await fresh
    assert fresh_value == "user:2@10"
    slow.set_result("old row")
    stale_value = await stale
    assert stale_value == "old row"
    cached = await cache.get("user:2")
    assert cached == "user:2@10"
    assert len(load.calls) == 4


@test("forgotten loads that settle while a newer load is in flight, by value or by error, leave the newer load in charge")
async def _():
    _, load, cache = setup()
    first, second, third = deferred(), deferred(), deferred()
    load.answer_next(first)
    load.answer_next(second)
    load.answer_next(third)
    resolves_late = await started(cache.get("user:3"))
    cache.invalidate("user:3")
    rejects_late = await started(cache.get("user:3"))
    cache.invalidate("user:3")
    current = await started(cache.get("user:3"))
    assert len(load.calls) == 3
    first.set_result("old row")
    old = await resolves_late
    assert old == "old row"
    second.set_exception(ConnectionError("database timeout"))
    error = await capture_error(rejects_late)
    assert str(error) == "database timeout"
    joined = await started(cache.get("user:3"))
    assert len(load.calls) == 3
    third.set_result("new row")
    newest = await current
    assert newest == "new row"
    shared = await joined
    assert shared == "new row"
    cached = await cache.get("user:3")
    assert cached == "new row"
    assert len(load.calls) == 3
