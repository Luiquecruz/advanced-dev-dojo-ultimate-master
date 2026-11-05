import asyncio
from collections.abc import AsyncGenerator, AsyncIterator, Awaitable, Callable
from contextlib import aclosing
from types import TracebackType
from typing import Any, Self


async def paginate(fetch_page: Callable[[int], Awaitable[list[Any] | None]]) -> AsyncIterator[Any]:
    """Yield every item, page after page, fetching the next page only when the current one is used up."""
    number = 1
    while (page := await fetch_page(number)) is not None:
        for item in page:
            yield item
        number += 1


async def collect(generator: AsyncGenerator[Any, None], limit: int | None = None) -> list[Any]:
    """Return the items of an async generator, at most `limit`; close the generator before returning."""
    items: list[Any] = []
    async with aclosing(generator) as values:
        async for item in values:
            items.append(item)
            if limit is not None and len(items) >= limit:
                break
    return items


class AsyncConnection:
    """An async context manager that opens on enter and always closes on exit."""

    def __init__(self, pages: list[list[Any]], recorder: list[str]) -> None:
        self.pages = pages
        self.recorder = recorder
        self.is_open = False

    async def __aenter__(self) -> Self:
        await asyncio.sleep(0)
        self.is_open = True
        self.recorder.append("open")
        return self

    async def __aexit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        traceback: TracebackType | None,
    ) -> None:
        self.is_open = False
        self.recorder.append("close")

    async def fetch_page(self, number: int) -> list[Any] | None:
        if not self.is_open:
            raise RuntimeError("connection is closed")
        await asyncio.sleep(0)
        if 1 <= number <= len(self.pages):
            return self.pages[number - 1]
        return None
