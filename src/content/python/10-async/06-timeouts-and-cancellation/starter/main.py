import asyncio
from collections.abc import Awaitable, Callable
from typing import Any

PENDING_COMMITS: set[asyncio.Task[Any]] = set()


async def with_deadline(coroutine_factory: Callable[[], Awaitable[Any]], seconds: float) -> Any:
    """Return the result of coroutine_factory(), or raise TimeoutError after `seconds` and cancel the work."""
    # TODO: asyncio.wait only reports that the work is not done: on timeout it keeps running in the background.
    # Use `async with asyncio.timeout(seconds):` so the work is cancelled when the deadline passes.
    work = asyncio.ensure_future(coroutine_factory())
    done, _ = await asyncio.wait({work}, timeout=seconds)
    if not done:
        raise TimeoutError(f"no answer within {seconds}s")
    return work.result()


async def worker(inbox: asyncio.Queue[Callable[[], Awaitable[Any]]], recorder: list[str]) -> None:
    """Run jobs from the inbox forever; a failing job is recorded, cancellation stops the worker."""
    # TODO: record "failed:<ExceptionType>" for a failing job, and "cleanup" in a finally block when the worker stops.
    # The bare except below also catches CancelledError, so a worker cancelled during a job never stops.
    while True:
        job = await inbox.get()
        try:
            recorder.append(f"done:{await job()}")
        except:
            recorder.append("failed")


async def shielded_commit(commit: Callable[[], Awaitable[Any]], recorder: list[str]) -> Any:
    """Run commit() so that cancelling the caller does not cancel the commit."""
    # TODO: run commit() in a task kept in PENDING_COMMITS until it is done, await it through asyncio.shield,
    # and record "caller-cancelled" before re-raising when the caller is cancelled.
    return await commit()
