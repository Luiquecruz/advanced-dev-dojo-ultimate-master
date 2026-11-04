from collections.abc import Generator, Iterable, Iterator
from typing import Any


def flatten(nested: Iterable[Any]) -> Iterator[Any]:
    """Yield the leaves of arbitrarily nested iterables; str and bytes are leaves."""
    # TODO: descend into every iterable (tuples, ranges, generators...), not only lists, with yield from.
    # Keep str and bytes whole: a one-character string is itself iterable.
    for item in nested:
        if isinstance(item, list):
            for leaf in flatten(item):
                yield leaf
        else:
            yield item


def running_average() -> Generator[float | None, float, None]:
    """Prime with next(); each send(value) yields the mean of every value sent so far."""
    # TODO: keep a total and a count in the generator's locals and yield the mean, not the last value.
    average: float | None = None
    while True:
        value = yield average
        average = value


def collect[Y, R](generator: Generator[Y, Any, R]) -> tuple[list[Y], R]:
    """Run a generator to the end and return its items and its return value."""
    # TODO: list() drops the return value. Call next() yourself and read StopIteration.value at the end.
    return list(generator), None


def tracked[T](iterable: Iterable[T], log: list[str]) -> Iterator[T]:
    """Yield every item and append "closed" to log once, however the generator ends."""
    # TODO: this only logs when the loop runs to the end. Log in a finally block so close() and errors log too.
    for item in iterable:
        yield item
    log.append("closed")
