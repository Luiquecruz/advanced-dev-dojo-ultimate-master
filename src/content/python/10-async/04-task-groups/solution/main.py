import asyncio
from collections.abc import Awaitable, Callable
from typing import Any

Handler = Callable[[Any], Awaitable[Any]]


async def process_batch(items: list[Any], handler: Handler) -> list[Any]:
    """Run handler(item) for every item in one task group; return the results in item order."""
    async with asyncio.TaskGroup() as group:
        tasks = [group.create_task(handler(item)) for item in items]
    return [task.result() for task in tasks]


async def handle_failures(items: list[Any], handler: Handler) -> dict[str, Any]:
    """Process a batch and count its failures by kind; other errors propagate."""
    report: dict[str, Any] = {"results": None, "invalid": 0, "unavailable": 0}
    try:
        report["results"] = await process_batch(items, handler)
    except* ValueError as group:
        report["invalid"] = len(group.exceptions)
    except* ConnectionError as group:
        report["unavailable"] = len(group.exceptions)
    return report
