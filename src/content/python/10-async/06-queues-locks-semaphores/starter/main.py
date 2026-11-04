import asyncio
from collections.abc import Awaitable, Callable, Iterable
from typing import Any, Protocol


async def run_pipeline(items: Iterable[Any], handler: Callable[[Any], Awaitable[Any]], workers: int, queue_size: int) -> list[Any]:
    """Feed items through a bounded queue to `workers` consumers; return the results in item order."""
    # TODO: a list is an unbounded buffer: this pulls every item up front and runs one handler at a time.
    # Feed an asyncio.Queue(maxsize=queue_size) from a producer task, start `workers` consumer tasks,
    # and stop the consumers when the producer is done (Queue.shutdown, or join and cancel).
    buffer = list(items)
    return [await handler(item) for item in buffer]


async def limited_gather(factories: list[Callable[[], Awaitable[Any]]], limit: int) -> list[Any]:
    """Run every factory with at most `limit` running at once; return the results in input order."""
    # TODO: this starts every factory at once. Hold an asyncio.Semaphore(limit) around each call.
    return list(await asyncio.gather(*(factory() for factory in factories)))


class Store(Protocol):
    async def read(self) -> int: ...

    async def write(self, value: int) -> None: ...


class SafeCounter:
    """A counter kept in a remote store: every increment reads, then writes, across awaits."""

    def __init__(self, store: Store) -> None:
        self._store = store

    async def increment(self) -> int:
        # TODO: while this increment waits for the store, another one reads the same value, and one update is lost.
        # Hold one asyncio.Lock (created in __init__) from the read to the write.
        current = await self._store.read()
        await self._store.write(current + 1)
        return current + 1
