import asyncio
from collections.abc import Awaitable, Callable, Coroutine
from typing import Any

Source = Callable[[], Awaitable[Any]]


async def fetch_all(sources: list[Source]) -> list[Any]:
    """Run every source at the same time; the first error propagates."""
    # TODO: this awaits one source at a time. Run them together with asyncio.gather, keeping the input order.
    return [await source() for source in sources]


async def fetch_settled(sources: list[Source]) -> tuple[list[Any], list[Exception]]:
    """Run every source at the same time and split the values from the errors, both in input order."""
    # TODO: gather with return_exceptions=True, then split the outcomes into (values, errors).
    return [], []


async def first_done(coroutines: list[Coroutine[Any, Any, Any]]) -> Any:
    """Return the result of the coroutine that finishes first; cancel the others and wait for them."""
    # TODO: wrap each coroutine in a task, wait with asyncio.wait(..., return_when=asyncio.FIRST_COMPLETED),
    # cancel the pending tasks, wait for them to finish cancelling, and return the first result.
    for coroutine in coroutines:
        coroutine.close()
    return None
