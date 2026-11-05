import asyncio
from collections.abc import Awaitable, Callable, Iterable
from typing import Any, Protocol


async def run_pipeline(items: Iterable[Any], handler: Callable[[Any], Awaitable[Any]], workers: int, queue_size: int) -> list[Any]:
    """Feed items through a bounded queue to `workers` consumers; return the results in item order."""
    queue: asyncio.Queue[tuple[int, Any]] = asyncio.Queue(maxsize=queue_size)
    results: dict[int, Any] = {}

    async def produce() -> None:
        for index, item in enumerate(items):
            await queue.put((index, item))
        queue.shutdown()

    async def consume() -> None:
        while True:
            try:
                index, item = await queue.get()
            except asyncio.QueueShutDown:
                return
            results[index] = await handler(item)

    async with asyncio.TaskGroup() as group:
        group.create_task(produce())
        for _ in range(workers):
            group.create_task(consume())
    return [results[index] for index in sorted(results)]


async def limited_gather(factories: list[Callable[[], Awaitable[Any]]], limit: int) -> list[Any]:
    """Run every factory with at most `limit` running at once; return the results in input order."""
    semaphore = asyncio.Semaphore(limit)

    async def run(factory: Callable[[], Awaitable[Any]]) -> Any:
        async with semaphore:
            return await factory()

    async with asyncio.TaskGroup() as group:
        tasks = [group.create_task(run(factory)) for factory in factories]
    return [task.result() for task in tasks]


class Store(Protocol):
    async def read(self) -> int: ...

    async def write(self, value: int) -> None: ...


class SafeCounter:
    """A counter kept in a remote store: every increment reads, then writes, across awaits."""

    def __init__(self, store: Store) -> None:
        self._store = store
        self._lock = asyncio.Lock()

    async def increment(self) -> int:
        async with self._lock:
            current = await self._store.read()
            await self._store.write(current + 1)
            return current + 1
