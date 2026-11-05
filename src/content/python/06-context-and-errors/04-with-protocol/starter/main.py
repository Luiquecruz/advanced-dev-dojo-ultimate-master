from collections.abc import Callable
from types import TracebackType
from typing import Any, Self


class Timer:
    """Measures the time spent inside a with block, using an injected clock."""

    def __init__(self, clock: Callable[[], float]) -> None:
        self.clock = clock
        self.started: float | None = None
        self.elapsed: float | None = None

    def __enter__(self) -> Self:
        # TODO: read the clock, then return the object the `as` target must receive.
        self.started = self.clock()

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        traceback: TracebackType | None,
    ) -> bool:
        # TODO: store the time spent in the block in self.elapsed, also when the block raised.
        return False


class Transaction:
    """Begins on enter, commits when the block succeeds, rolls back and re-raises when it fails."""

    def __init__(self, store: Any) -> None:
        self.store = store
        self.error: BaseException | None = None

    def __enter__(self) -> Self:
        self.store.begin()
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        traceback: TracebackType | None,
    ) -> bool:
        # TODO: commit only when the block succeeded. On an exception, keep it in self.error,
        # roll back, and let the exception propagate.
        self.store.commit()
        return True
