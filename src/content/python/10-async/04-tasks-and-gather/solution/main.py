import asyncio
from collections.abc import Awaitable, Callable, Coroutine
from typing import Any

Source = Callable[[], Awaitable[Any]]


async def fetch_all(sources: list[Source]) -> list[Any]:
    """Run every source at the same time; the first error propagates."""
    return list(await asyncio.gather(*(source() for source in sources)))


async def fetch_settled(sources: list[Source]) -> tuple[list[Any], list[Exception]]:
    """Run every source at the same time and split the values from the errors, both in input order."""
    outcomes = await asyncio.gather(*(source() for source in sources), return_exceptions=True)
    values = [outcome for outcome in outcomes if not isinstance(outcome, BaseException)]
    errors = [outcome for outcome in outcomes if isinstance(outcome, BaseException)]
    return values, errors


async def first_done(coroutines: list[Coroutine[Any, Any, Any]]) -> Any:
    """Return the result of the coroutine that finishes first; cancel the others and wait for them."""
    tasks = [asyncio.create_task(coroutine) for coroutine in coroutines]
    done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
    for task in pending:
        task.cancel()
    await asyncio.gather(*pending, return_exceptions=True)
    return done.pop().result()
