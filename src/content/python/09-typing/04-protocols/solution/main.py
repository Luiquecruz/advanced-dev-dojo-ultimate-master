from collections.abc import Iterable
from typing import Protocol, runtime_checkable


@runtime_checkable
class Renderable(Protocol):
    def render(self) -> str: ...


@runtime_checkable
class Closeable(Protocol):
    def close(self) -> None: ...


class Badge:
    """A label in brackets; matches Renderable by shape, without inheriting from it."""

    def __init__(self, label: str) -> None:
        self.label = label

    def render(self) -> str:
        return f"[{self.label}]"


def render_all(items: Iterable[object]) -> list[str]:
    """Render every Renderable item in order and skip the others."""
    return [item.render() for item in items if isinstance(item, Renderable)]


def close_all(resources: Iterable[object]) -> int:
    """Close every Closeable resource in order and return how many were closed."""
    closed = 0
    for resource in resources:
        if isinstance(resource, Closeable):
            resource.close()
            closed += 1
    return closed
