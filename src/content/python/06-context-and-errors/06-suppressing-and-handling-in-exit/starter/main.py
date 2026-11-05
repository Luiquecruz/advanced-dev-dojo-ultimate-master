from collections.abc import Callable, Iterable
from types import TracebackType
from typing import Any, Self


class Suppress:
    """Swallows exceptions of the listed types, and of their subclasses, raised inside the block."""

    def __init__(self, *types: type[BaseException]) -> None:
        self.types = types

    def __enter__(self) -> Self:
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        traceback: TracebackType | None,
    ) -> bool:
        # TODO: return True only when the block raised an instance of one of self.types.
        return exc is not None


class ErrorCollector:
    """Collects matching exceptions in `errors` and suppresses them; any other exception propagates."""

    def __init__(self, *types: type[BaseException]) -> None:
        self.types = types
        self.errors: list[BaseException] = []

    def __enter__(self) -> Self:
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        traceback: TracebackType | None,
    ) -> bool:
        # TODO: append a matching exception to self.errors and suppress it; let anything else propagate.
        return False


def run_all(callables: Iterable[Callable[[], Any]]) -> tuple[list[Any], list[BaseException]]:
    # TODO: call every callable inside one ErrorCollector(Exception) and return (results, errors).
    results = []
    for function in callables:
        results.append(function())
    return results, []
