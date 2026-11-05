import asyncio

from main import SafeCounter, limited_gather, run_pipeline


class Stats:
    def __init__(self) -> None:
        self.active = 0
        self.peak = 0


async def main() -> None:
    pulled: list[int] = []

    def orders():
        for number in range(1, 9):
            pulled.append(number)
            yield number

    stats = Stats()

    async def ship(order: int) -> str:
        stats.active += 1
        stats.peak = max(stats.peak, stats.active)
        await asyncio.sleep(0.01)
        stats.active -= 1
        return f"order-{order} shipped"

    pipeline = asyncio.create_task(run_pipeline(orders(), ship, workers=2, queue_size=2))
    await asyncio.sleep(0.005)
    print("pulled while the first two orders ship:", len(pulled), "of 8")
    results = await pipeline
    print("pipeline:", results[:2], "...", len(results), "results, peak", stats.peak, "handlers at once")

    limits = Stats()

    def download(page: int):
        async def run() -> int:
            limits.active += 1
            limits.peak = max(limits.peak, limits.active)
            await asyncio.sleep(0.01)
            limits.active -= 1
            return page

        return run

    pages = await limited_gather([download(page) for page in range(10)], 3)
    print("limited_gather:", pages, "| peak:", limits.peak)

    class Store:
        def __init__(self) -> None:
            self.value = 0

        async def read(self) -> int:
            await asyncio.sleep(0.001)
            return self.value

        async def write(self, value: int) -> None:
            await asyncio.sleep(0.001)
            self.value = value

    store = Store()
    counter = SafeCounter(store)
    await asyncio.gather(*(counter.increment() for _ in range(20)))
    print("counter after 20 concurrent increments:", store.value)


if __name__ == "__main__":
    asyncio.run(main())
