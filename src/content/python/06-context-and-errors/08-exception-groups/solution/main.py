from collections.abc import Callable, Iterable
from typing import Any

Rule = Callable[[Any], object]


def validate_all(record: Any, rules: Iterable[Rule]) -> None:
    errors = []
    for rule in rules:
        try:
            rule(record)
        except Exception as error:
            errors.append(error)
    if errors:
        raise ExceptionGroup("validation failed", errors)


def leaves(group: BaseExceptionGroup) -> list[BaseException]:
    found = []
    for error in group.exceptions:
        if isinstance(error, BaseExceptionGroup):
            found.extend(leaves(error))
        else:
            found.append(error)
    return found


def handle(group: ExceptionGroup) -> dict[str, int]:
    counts = {"ValueError": 0, "TypeError": 0}
    try:
        raise group
    except* ValueError as matched:
        counts["ValueError"] = len(leaves(matched))
    except* TypeError as matched:
        counts["TypeError"] = len(leaves(matched))
    return counts


def only(group: ExceptionGroup, kind: type[Exception]) -> ExceptionGroup | None:
    return group.subgroup(kind)
