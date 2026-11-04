from collections.abc import Callable, Iterable
from typing import Any


def read_chunks(read: Callable[[int], bytes | str], size: int) -> list[bytes | str]:
    """Call read(size) until it returns an empty chunk and collect every non-empty chunk."""
    chunks = []
    while chunk := read(size):
        chunks.append(chunk)
    return chunks


def find_first(items: Iterable[Any], predicate: Callable[[Any], Any]) -> tuple[int, Any] | None:
    """Index and item of the first item for which predicate is truthy, or None."""
    for index, item in enumerate(items):
        if predicate(item):
            break
    else:
        return None
    return (index, item)


def parse_line(line: str) -> tuple[str, str] | None:
    """Split "key = value" into a stripped pair; None for blanks, comments and lines without a key."""
    text = line.strip()
    if not text or text.startswith("#"):
        return None
    key, separator, value = text.partition("=")
    return (name, value.strip()) if separator and (name := key.strip()) else None


def parse_pairs(lines: Iterable[str], parse: Callable[[str], tuple[str, str] | None] = parse_line) -> dict[str, str]:
    """Settings from the lines that parse, calling parse once per line; later keys win."""
    return dict(pair for line in lines if (pair := parse(line)) is not None)
