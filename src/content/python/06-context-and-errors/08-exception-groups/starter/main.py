from collections.abc import Callable, Iterable
from typing import Any

Rule = Callable[[Any], object]


def validate_all(record: Any, rules: Iterable[Rule]) -> None:
    # TODO: run every rule, keep the exception of each failing rule, and raise them together as
    # ExceptionGroup("validation failed", errors). Raise nothing when every rule passes.
    for rule in rules:
        rule(record)


def handle(group: ExceptionGroup) -> dict[str, int]:
    # TODO: raise the group inside try and count, with except* ValueError and except* TypeError,
    # how many leaf exceptions of each type it holds (nested groups included). Everything else
    # must propagate as an exception group.
    return {"ValueError": 0, "TypeError": 0}


def only(group: ExceptionGroup, kind: type[Exception]) -> ExceptionGroup | None:
    # TODO: return the part of the group that matches kind, keeping its message and nesting,
    # or None when nothing matches.
    return group
