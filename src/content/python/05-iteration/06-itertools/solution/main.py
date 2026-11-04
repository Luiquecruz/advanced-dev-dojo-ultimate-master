from collections.abc import Iterable, Iterator
from itertools import accumulate, batched, groupby, pairwise
from operator import itemgetter
from typing import Any


def batches[T](records: Iterable[T], size: int) -> Iterator[tuple[T, ...]]:
    """Lazy tuples of size records; the last batch may be shorter."""
    return batched(records, size)


def runs(events: Iterable[dict[str, Any]]) -> list[tuple[str, int]]:
    """Length of every run of consecutive events with the same status."""
    return [(status, sum(1 for _ in group)) for status, group in groupby(events, key=itemgetter("status"))]


def running_totals(amounts: Iterable[float]) -> list[float]:
    """Cumulative sum after each amount."""
    return list(accumulate(amounts))


def transitions(statuses: Iterable[str]) -> list[tuple[str, str]]:
    """Every change between two adjacent statuses, as (before, after)."""
    return [(before, after) for before, after in pairwise(statuses) if before != after]
