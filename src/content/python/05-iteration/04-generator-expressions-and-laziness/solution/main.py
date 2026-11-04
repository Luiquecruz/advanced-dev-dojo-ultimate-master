from collections.abc import Callable, Iterable
from typing import Any


def first_match[T](items: Iterable[T], predicate: Callable[[T], object], default: Any = None) -> Any:
    """Return the first item for which predicate is truthy, or default."""
    return next((item for item in items if predicate(item)), default)


def total_valid(records: Iterable[dict[str, Any]], is_valid: Callable[[dict[str, Any]], object]) -> Any:
    """Sum the "amount" of every record that is_valid accepts, one record at a time."""
    return sum(record["amount"] for record in records if is_valid(record))


def count_evaluations[T](items: Iterable[T], predicate: Callable[[T], object]) -> tuple[bool, int]:
    """Return any() of predicate over items and how many times predicate ran."""
    evaluations = 0

    def recording(item: T) -> object:
        nonlocal evaluations
        evaluations += 1
        return predicate(item)

    found = any(recording(item) for item in items)
    return found, evaluations
