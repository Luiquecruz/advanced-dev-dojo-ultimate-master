from collections.abc import Iterable, Iterator
from typing import Any


def batches[T](records: Iterable[T], size: int) -> Iterator[tuple[T, ...]]:
    """Lazy tuples of size records; the last batch may be shorter."""
    # TODO: use itertools.batched. This copies every record into a list first, returns a list
    # instead of a lazy iterator, and drops the short last batch.
    items = list(records)
    return [tuple(items[start:start + size]) for start in range(0, len(items) - size + 1, size)]


def runs(events: Iterable[dict[str, Any]]) -> list[tuple[str, int]]:
    """Length of every run of consecutive events with the same status."""
    # TODO: count consecutive runs with itertools.groupby. A dict, like Object.groupBy,
    # merges every occurrence of a status into one total.
    counts: dict[str, int] = {}
    for event in events:
        counts[event["status"]] = counts.get(event["status"], 0) + 1
    return list(counts.items())


def running_totals(amounts: Iterable[float]) -> list[float]:
    """Cumulative sum after each amount."""
    # TODO: cumulative sums with itertools.accumulate.
    return list(amounts)


def transitions(statuses: Iterable[str]) -> list[tuple[str, str]]:
    """Every change between two adjacent statuses, as (before, after)."""
    # TODO: pair each status with the next one using itertools.pairwise and keep only the pairs that differ.
    return []
