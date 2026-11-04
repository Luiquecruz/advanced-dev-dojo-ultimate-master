import asyncio
from collections.abc import Coroutine
from typing import Any


async def fetch(name: str, recorder: list[str]) -> str:
    """Record the start, give control back to the event loop, then record the end."""
    recorder.append(f"start:{name}")
    # TODO: give control back to the event loop here, so other tasks can run between the two records.
    recorder.append(f"end:{name}")
    return f"data:{name}"


async def run_sequential(names: list[str], recorder: list[str]) -> list[str]:
    # TODO: await fetch for each name, one after the other, and return the results in input order.
    return []


async def run_concurrent(names: list[str], recorder: list[str]) -> list[str]:
    # TODO: in JavaScript, creating every promise first makes them run at the same time.
    # These coroutines only start when awaited, one by one. Wrap each one in a task instead.
    pending = [fetch(name, recorder) for name in names]
    return [await coroutine for coroutine in pending]


def lazy_coroutine(recorder: list[str]) -> Coroutine[Any, Any, str]:
    # TODO: return the coroutine fetch("lazy", recorder) without starting it. A task starts on the next loop tick.
    return asyncio.ensure_future(fetch("lazy", recorder))
