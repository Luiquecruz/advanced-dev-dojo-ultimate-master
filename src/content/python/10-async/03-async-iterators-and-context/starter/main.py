import asyncio
from collections.abc import AsyncGenerator, AsyncIterator, Awaitable, Callable
from contextlib import aclosing
from types import TracebackType
from typing import Any, Self


async def paginate(fetch_page: Callable[[int], Awaitable[list[Any] | None]]) -> AsyncIterator[Any]:
    """Yield every item, page after page, fetching the next page only when the current one is used up."""
    # TODO: this downloads every page before yielding the first item, like collecting an array first.
    # Yield the items of each page as soon as that page arrives, and fetch the next one only afterwards.
    pages = []
    number = 1
    while (page := await fetch_page(number)) is not None:
        pages.append(page)
        number += 1
    for page in pages:
        for item in page:
            yield item


async def collect(generator: AsyncGenerator[Any, None], limit: int | None = None) -> list[Any]:
    """Return the items of an async generator, at most `limit`; close the generator before returning."""
    # TODO: in JavaScript, `break` inside `for await` closes the generator. In Python the generator stays
    # suspended after `break` until the garbage collector finalizes it. Close it here with contextlib.aclosing.
    items: list[Any] = []
    async for item in generator:
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
        # TODO: mark the connection open and record "open" before returning it.
        return self

    async def __aexit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        traceback: TracebackType | None,
    ) -> bool:
        # TODO: mark the connection closed and record "close", even when the block raised.
        # Returning True swallows the block's exception: let it propagate instead.
        return True

    async def fetch_page(self, number: int) -> list[Any] | None:
        # TODO: raise RuntimeError when the connection is not open.
        await asyncio.sleep(0)
        if 1 <= number <= len(self.pages):
            return self.pages[number - 1]
        return None
