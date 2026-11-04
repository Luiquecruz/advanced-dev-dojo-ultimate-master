from collections.abc import Iterable, Iterator


def read_blocks(lines: Iterable[str]) -> Iterator[list[str]]:
    """Yield each group of consecutive non-blank lines as soon as it is complete."""
    # TODO: make this a generator: yield each block when a blank line closes it, instead of
    # collecting every block in a list first. The last block is lost when no blank line follows it.
    blocks = []
    block: list[str] = []
    for line in lines:
        if line.strip():
            block.append(line)
        elif block:
            blocks.append(block)
            block = []
    return blocks


def take[T](count: int, iterable: Iterable[T]) -> Iterator[T]:
    """Yield at most count items without pulling one more from the source."""
    # TODO: yield the items one by one and stop after count of them; this reads the whole source first.
    return list(iterable)[:count]


def id_sequence(prefix: str) -> Iterator[str]:
    """Yield prefix-1, prefix-2, ... without end."""
    # TODO: yield ids without end; a list can only hold a fixed number of them.
    return [f"{prefix}-{number}" for number in range(1, 4)]
