from collections.abc import Iterable
from typing import Self


class Paginator:
    """Re-iterable view over pages: every loop gets its own cursor."""

    def __init__(self, pages: list[list[str]]) -> None:
        self.pages = pages
        self.page_index = 0
        self.item_index = 0

    def __iter__(self) -> Self:
        # TODO: return a new, independent iterator on every call. The Paginator must not hold the position:
        # move page_index, item_index and __next__ to a separate cursor class.
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


class LineReader:
    """One-shot iterator over text lines, without their trailing newline."""

    def __init__(self, lines: Iterable[str]) -> None:
        self.lines = list(lines)
        self.position = 0
        self.line_number = 0

    def __iter__(self):
        # TODO: a LineReader is its own iterator: return self.
        return iter(self.lines)

    def __next__(self) -> str | None:
        # TODO: return the next line without its trailing "\n", count it in line_number,
        # and raise StopIteration (on every call) once no line is left.
        if self.position >= len(self.lines):
            return None
        line = self.lines[self.position]
        self.position += 1
        return line


def is_iterator(obj: object) -> bool:
    # TODO: True when iter(obj) returns obj itself; False (without raising) for non-iterables.
    return False


def is_reiterable(obj: object) -> bool:
    # TODO: True when obj is iterable and iter(obj) returns a different object; False for non-iterables.
    return False
