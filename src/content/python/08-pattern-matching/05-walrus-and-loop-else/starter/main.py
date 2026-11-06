from collections.abc import Callable, Iterable
from typing import Any


def read_chunks(read: Callable[[int], bytes | str], size: int) -> list[bytes | str]:
    """Call read(size) until it returns an empty chunk and collect every non-empty chunk."""
    # TODO: this `while True` loop appends before checking, so it also keeps the empty chunk that marks the end. Loop with `while chunk := read(size)`.
    chunks = []
    while True:
        chunk = read(size)
        chunks.append(chunk)
        if not chunk:
            break
    return chunks


def find_first(items: Iterable[Any], predicate: Callable[[Any], Any]) -> tuple[int, Any] | None:
    """Index and item of the first item for which predicate is truthy, or None."""
    # TODO: this `else` belongs to the `if`, so the loop gives up after the first item.
    # Use for ... else: break on the first match, and return None only from the loop's else.
    for index, item in enumerate(items):
        if predicate(item):
            return (index, item)
        else:
            return None
    return None


def parse_line(line: str) -> tuple[str, str] | None:
    """Split "key = value" into a stripped pair; None for blanks, comments and lines without a key."""
    text = line.strip()
    if not text or text.startswith("#"):
        return None
    key, separator, value = text.partition("=")
    return (name, value.strip()) if separator and (name := key.strip()) else None


def parse_pairs(lines: Iterable[str], parse: Callable[[str], tuple[str, str] | None] = parse_line) -> dict[str, str]:
    """Settings from the lines that parse, calling parse once per line; later keys win."""
    # TODO: this parses every kept line twice, once in the filter and once for the value.
    # Bind the result once with := in the filter and reuse it.
    return dict(parse(line) for line in lines if parse(line) is not None)
