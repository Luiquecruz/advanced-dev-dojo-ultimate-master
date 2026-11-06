import asyncio
from collections import Counter


async def ticks(count):
    for _ in range(count):
        await asyncio.sleep(0)


class Probe:
    """Tracks how many calls run at the same time and the highest number seen."""

    def __init__(self):
        self.active = 0
        self.peak = 0
        self.seen = []

    def wrap(self, steps, gate=None):
        """`steps` is a number of ticks, or a function of the item so that items finish out of order."""

        async def handle(item):
            self.active += 1
            self.peak = max(self.peak, self.active)
            self.seen.append(item)
            try:
                if gate is not None:
                    await gate.wait()
                for _ in range(steps(item) if callable(steps) else steps):
                    await asyncio.sleep(0)
                return item * 10
            finally:
                self.active -= 1

        return handle


@test("run_pipeline processes every item exactly once, returns the results in item order and stops its workers")
async def _():
    probe = Probe()
    before = len(asyncio.all_tasks())
    results = await mod.run_pipeline(range(12), probe.wrap(lambda item: (12 - item) % 5), workers=3, queue_size=2)
    after = len(asyncio.all_tasks())
    counts = Counter(probe.seen)
    assert results == [index * 10 for index in range(12)]
    assert counts == Counter(range(12))
    assert after == before


@test("run_pipeline runs as many handlers at once as there are workers")
async def _():
    probe = Probe()
    await mod.run_pipeline(range(10), probe.wrap(3), workers=3, queue_size=2)
    peak = probe.peak
    assert peak == 3


@test("run_pipeline pulls the next item only when the bounded queue has room")
async def _():
    pulled = []

    def items():
        for index in range(50):
            pulled.append(index)
            yield index

    gate = asyncio.Event()
    probe = Probe()
    pipeline = asyncio.create_task(mod.run_pipeline(items(), probe.wrap(0, gate), workers=2, queue_size=3))
    await ticks(20)
    in_flight = len(pulled)
    gate.set()
    results = await pipeline
    assert in_flight <= 2 + 3 + 1
    assert results == [index * 10 for index in range(50)]


@test("limited_gather never runs more than limit factories at once and keeps the input order")
async def _():
    probe = Probe()
    handle = probe.wrap(lambda item: 2 + (9 - item) % 4)
    factories = [lambda item=item: handle(item) for item in range(9)]
    results = await mod.limited_gather(factories, 4)
    peak = probe.peak
    assert results == [item * 10 for item in range(9)]
    assert peak == 4


class Store:
    """A remote value: reading and writing each take one round trip."""

    def __init__(self):
        self.value = 0
        self.reads = 0

    async def read(self):
        self.reads += 1
        await asyncio.sleep(0)
        return self.value

    async def write(self, value):
        await asyncio.sleep(0)
        self.value = value


# beginner mistake: reading and writing the store across awaits without a lock, so concurrent increments lose updates
@test("SafeCounter.increment keeps every update when many increments run at once")
async def _():
    store = Store()
    counter = mod.SafeCounter(store)
    async with asyncio.TaskGroup() as group:
        tasks = [group.create_task(counter.increment()) for _ in range(50)]
    returned = sorted(task.result() for task in tasks)
    value = store.value
    reads = store.reads
    assert reads == 50
    assert value == 50
    assert returned == list(range(1, 51))
