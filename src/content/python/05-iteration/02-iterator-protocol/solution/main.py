from collections.abc import Iterable
from typing import Self


class PageCursor:
    """One pass over the items of a list of pages."""

    def __init__(self, pages: list[list[str]]) -> None:
        self.pages = pages
        self.page_index = 0
        self.item_index = 0

    def __iter__(self) -> Self:
        return self

    def __next__(self) -> str:
        while self.page_index < len(self.pages):
            page = self.pages[self.page_index]
            if self.item_index < len(page):
                item = page[self.item_index]
                self.item_index += 1
                return item
            self.page_index += 1
            self.item_index = 0
        raise StopIteration


class Paginator:
    """Re-iterable view over pages: every loop gets its own cursor."""

    def __init__(self, pages: list[list[str]]) -> None:
        self.pages = pages

    def __iter__(self) -> PageCursor:
        return PageCursor(self.pages)


class LineReader:
    """One-shot iterator over text lines, without their trailing newline."""

    def __init__(self, lines: Iterable[str]) -> None:
        self._lines = iter(lines)
        self.line_number = 0

    def __iter__(self) -> Self:
        return self

    def __next__(self) -> str:
        line = next(self._lines)
        self.line_number += 1
        return line.removesuffix("\n")


def is_iterator(obj: object) -> bool:
    try:
        return iter(obj) is obj
    except TypeError:
        return False


def is_reiterable(obj: object) -> bool:
    try:
        return iter(obj) is not obj
    except TypeError:
        return False
