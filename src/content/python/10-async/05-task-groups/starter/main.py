import asyncio
from collections.abc import Awaitable, Callable
from typing import Any

Handler = Callable[[Any], Awaitable[Any]]


async def process_batch(items: list[Any], handler: Handler) -> list[Any]:
    """Run handler(item) for every item in one task group; return the results in item order."""
    # TODO: after a failure, gather lets the other handlers keep running,
    # and the error is raised alone. Start the handlers in an asyncio.TaskGroup instead.
    return list(await asyncio.gather(*(handler(item) for item in items)))


async def handle_failures(items: list[Any], handler: Handler) -> dict[str, Any]:
    """Process a batch and count its failures by kind; other errors propagate."""
    report: dict[str, Any] = {"results": None, "invalid": 0, "unavailable": 0}
    # TODO: a task group raises an ExceptionGroup, which `except ValueError` never matches.
    # Use except* ValueError and except* ConnectionError, and count the exceptions in each group.
    try:
        report["results"] = await process_batch(items, handler)
    except ValueError:
        report["invalid"] = 1
    return report
