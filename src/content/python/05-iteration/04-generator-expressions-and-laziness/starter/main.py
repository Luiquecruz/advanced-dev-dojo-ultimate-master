from collections.abc import Callable, Iterable
from typing import Any


def first_match[T](items: Iterable[T], predicate: Callable[[T], object], default: Any = None) -> Any:
    """Return the first item for which predicate is truthy, or default."""
    # TODO: stop at the first match: call next() on a generator expression, passing default.
    # This list comprehension tests every item and consumes the whole input.
    matches = [item for item in items if predicate(item)]
    return matches[0] if matches else default


def total_valid(records: Iterable[dict[str, Any]], is_valid: Callable[[dict[str, Any]], object]) -> Any:
    """Sum the "amount" of every record that is_valid accepts, one record at a time."""
    # TODO: feed sum() a generator expression so each amount is added before the next record is read.
    valid_amounts = [record["amount"] for record in records if is_valid(record)]
    return sum(valid_amounts)


def count_evaluations[T](items: Iterable[T], predicate: Callable[[T], object]) -> tuple[bool, int]:
    """Return any() of predicate over items and how many times predicate ran."""
    evaluations = 0

    def recording(item: T) -> object:
        nonlocal evaluations
        evaluations += 1
        return predicate(item)

    # TODO: any() can only stop early when it receives a generator expression, not a finished list.
    found = any([recording(item) for item in items])
    return found, evaluations
