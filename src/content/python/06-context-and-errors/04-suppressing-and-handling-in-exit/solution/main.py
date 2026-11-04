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
        return exc is not None and isinstance(exc, self.types)


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
        if exc is None or not isinstance(exc, self.types):
            return False
        self.errors.append(exc)
        return True


def run_all(callables: Iterable[Callable[[], Any]]) -> tuple[list[Any], list[BaseException]]:
    collector = ErrorCollector(Exception)
    results = []
    for function in callables:
        with collector:
            results.append(function())
    return results, collector.errors
