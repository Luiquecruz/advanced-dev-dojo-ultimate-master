import asyncio
from collections.abc import Awaitable, Callable
from typing import Any

PENDING_COMMITS: set[asyncio.Task[Any]] = set()


async def with_deadline(coroutine_factory: Callable[[], Awaitable[Any]], seconds: float) -> Any:
    """Return the result of coroutine_factory(), or raise TimeoutError after `seconds` and cancel the work."""
    async with asyncio.timeout(seconds):
        return await coroutine_factory()


async def worker(inbox: asyncio.Queue[Callable[[], Awaitable[Any]]], recorder: list[str]) -> None:
    """Run jobs from the inbox forever; a failing job is recorded, cancellation stops the worker."""
    try:
        while True:
            job = await inbox.get()
            try:
                recorder.append(f"done:{await job()}")
            except Exception as error:
                recorder.append(f"failed:{type(error).__name__}")
    finally:
        recorder.append("cleanup")


async def shielded_commit(commit: Callable[[], Awaitable[Any]], recorder: list[str]) -> Any:
    """Run commit() so that cancelling the caller does not cancel the commit."""
    task = asyncio.create_task(commit())
    PENDING_COMMITS.add(task)
    task.add_done_callback(PENDING_COMMITS.discard)
    try:
        return await asyncio.shield(task)
    except asyncio.CancelledError:
        recorder.append("caller-cancelled")
        raise
