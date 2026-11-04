import asyncio
from collections.abc import Coroutine
from typing import Any


async def fetch(name: str, recorder: list[str]) -> str:
    """Record the start, give control back to the event loop, then record the end."""
    recorder.append(f"start:{name}")
    await asyncio.sleep(0)
    recorder.append(f"end:{name}")
    return f"data:{name}"


async def run_sequential(names: list[str], recorder: list[str]) -> list[str]:
    results = []
    for name in names:
        results.append(await fetch(name, recorder))
    return results


async def run_concurrent(names: list[str], recorder: list[str]) -> list[str]:
    tasks = [asyncio.create_task(fetch(name, recorder)) for name in names]
    return [await task for task in tasks]


def lazy_coroutine(recorder: list[str]) -> Coroutine[Any, Any, str]:
    return fetch("lazy", recorder)
