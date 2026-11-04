from collections.abc import Iterable, Iterator
from itertools import batched
from typing import Self

LEVELS = frozenset({"DEBUG", "INFO", "WARNING", "ERROR"})

type Record = dict[str, str]


def parse(lines: Iterable[str]) -> Iterator[Record]:
    """Turn "LEVEL message" lines into records, one at a time; blank lines are skipped."""
    for line in lines:
        text = line.removesuffix("\n")
        if not text.strip():
            continue
        level, _, message = text.partition(" ")
        if level not in LEVELS or not message:
            raise ValueError(f"malformed log line: {line!r}")
        yield {"level": level, "message": message}


def only_errors(records: Iterable[Record]) -> Iterator[Record]:
    """Keep the records whose level is ERROR."""
    for record in records:
        if record["level"] == "ERROR":
            yield record


def chunked[T](items: Iterable[T], size: int) -> Iterator[list[T]]:
    """Lists of up to size items, filled one at a time."""
    for batch in batched(items, size):
        yield list(batch)


class Source:
    """One-shot iterator over log lines that counts reads and can be closed."""

    def __init__(self, lines: Iterable[str]) -> None:
        self._lines = iter(lines)
        self.reads = 0
        self.closed = False

    def __iter__(self) -> Self:
        return self

    def __next__(self) -> str:
        line = next(self._lines)
        self.reads += 1
        return line

    def close(self) -> None:
        self.closed = True


def pipeline(source: Source, size: int = 100) -> Iterator[list[Record]]:
    """Chunks of error records pulled lazily from source; the source is closed however the pipeline ends."""
    try:
        yield from chunked(only_errors(parse(source)), size)
    finally:
        source.close()
