from collections.abc import Callable, Iterable, Iterator
from contextlib import AbstractContextManager, ExitStack, contextmanager
from types import TracebackType
from typing import Any, Self

Opener = Callable[[], AbstractContextManager[Any]]


@contextmanager
def open_all(openers: Iterable[Opener]) -> Iterator[list[Any]]:
    with ExitStack() as stack:
        yield [stack.enter_context(opener()) for opener in openers]


class ResourcePool:
    """Opens every resource up front and keeps them open until close()."""

    def __init__(self, openers: Iterable[Opener]) -> None:
        with ExitStack() as stack:
            self.resources = [stack.enter_context(opener()) for opener in openers]
            self._stack = stack.pop_all()

    def close(self) -> None:
        self._stack.close()

    def __enter__(self) -> Self:
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        traceback: TracebackType | None,
    ) -> bool:
        self.close()
        return False
