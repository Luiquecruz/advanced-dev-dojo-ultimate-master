from collections.abc import Iterable, Iterator
from typing import Self

LEVELS = frozenset({"DEBUG", "INFO", "WARNING", "ERROR"})

type Record = dict[str, str]


def parse(lines: Iterable[str]) -> Iterator[Record]:
    """Turn "LEVEL message" lines into records, one at a time; blank lines are skipped."""
    # TODO: make this a generator that yields one record per line, skip blank lines,
    # and put the offending line in the ValueError message.
    records = []
    for line in lines:
        level, _, message = line.removesuffix("\n").partition(" ")
        if level not in LEVELS or not message:
            raise ValueError("malformed log line")
        records.append({"level": level, "message": message})
    return records


def only_errors(records: Iterable[Record]) -> Iterator[Record]:
    """Keep the records whose level is ERROR."""
    # TODO: yield the ERROR records one at a time instead of building a list.
    return [record for record in records if record["level"] == "ERROR"]


def chunked[T](items: Iterable[T], size: int) -> Iterator[list[T]]:
    """Lists of up to size items, filled one at a time."""
    # TODO: yield lists of up to size items as soon as each one is full, and a shorter last list.
    return [list(items)]


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
        # TODO: record that the source was closed.
        pass


def pipeline(source: Source, size: int = 100) -> Iterator[list[Record]]:
    """Chunks of error records pulled lazily from source; the source is closed however the pipeline ends."""
    # TODO: make pipeline a generator that delegates to the stages and closes the source in a finally block,
    # so it is closed when the pipeline is exhausted, closed early or stopped by an error.
    return iter(chunked(only_errors(parse(source)), size))
