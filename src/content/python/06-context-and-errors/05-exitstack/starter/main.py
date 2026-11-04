from collections.abc import Callable, Iterable, Iterator
from contextlib import AbstractContextManager, ExitStack, contextmanager
from types import TracebackType
from typing import Any, Self

Opener = Callable[[], AbstractContextManager[Any]]


@contextmanager
def open_all(openers: Iterable[Opener]) -> Iterator[list[Any]]:
    # TODO: enter every resource on one ExitStack and yield the list of entered values. Everything
    # opened so far must be closed in reverse order when a later opener fails, when the block ends
    # (also with an exception), and even when one of the closes raises.
    managers = [opener() for opener in openers]
    values = [manager.__enter__() for manager in managers]
    yield values
    for manager in managers:
        manager.__exit__(None, None, None)


class ResourcePool:
    """Opens every resource up front and keeps them open until close()."""

    def __init__(self, openers: Iterable[Opener]) -> None:
        # TODO: open every resource and store the entered values in self.resources. If one fails,
        # close the ones already opened and let the error propagate. On success keep them open by
        # moving the callbacks to self._stack with ExitStack.pop_all().
        self.resources: list[Any] = []
        self._stack = ExitStack()

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
