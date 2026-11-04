from collections.abc import Generator, Iterable, Iterator
from typing import Any


def flatten(nested: Iterable[Any]) -> Iterator[Any]:
    """Yield the leaves of arbitrarily nested iterables; str and bytes are leaves."""
    for item in nested:
        if isinstance(item, (str, bytes)) or not isinstance(item, Iterable):
            yield item
        else:
            yield from flatten(item)


def running_average() -> Generator[float | None, float, None]:
    """Prime with next(); each send(value) yields the mean of every value sent so far."""
    total = 0.0
    count = 0
    average: float | None = None
    while True:
        value = yield average
        total += value
        count += 1
        average = total / count


def collect[Y, R](generator: Generator[Y, Any, R]) -> tuple[list[Y], R]:
    """Run a generator to the end and return its items and its return value."""
    items: list[Y] = []
    while True:
        try:
            items.append(next(generator))
        except StopIteration as stop:
            return items, stop.value


def tracked[T](iterable: Iterable[T], log: list[str]) -> Iterator[T]:
    """Yield every item and append "closed" to log once, however the generator ends."""
    try:
        yield from iterable
    finally:
        log.append("closed")
