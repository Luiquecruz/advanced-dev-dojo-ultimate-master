from collections.abc import Iterable, Iterator


def read_blocks(lines: Iterable[str]) -> Iterator[list[str]]:
    """Yield each group of consecutive non-blank lines as soon as it is complete."""
    block: list[str] = []
    for line in lines:
        if line.strip():
            block.append(line)
            continue
        if block:
            yield block
            block = []
    if block:
        yield block


def take[T](count: int, iterable: Iterable[T]) -> Iterator[T]:
    """Yield at most count items without pulling one more from the source."""
    if count <= 0:
        return
    for index, item in enumerate(iterable, start=1):
        yield item
        if index == count:
            return


def id_sequence(prefix: str) -> Iterator[str]:
    """Yield prefix-1, prefix-2, ... without end."""
    number = 1
    while True:
        yield f"{prefix}-{number}"
        number += 1
