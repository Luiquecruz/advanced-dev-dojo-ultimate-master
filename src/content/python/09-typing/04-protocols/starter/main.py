from abc import ABC, abstractmethod
from collections.abc import Iterable
from typing import Protocol


# TODO: make Renderable usable with isinstance().
class Renderable(Protocol):
    def render(self) -> str: ...


# TODO: turn Closeable into a runtime-checkable Protocol: resources must not have to inherit from it.
class Closeable(ABC):
    @abstractmethod
    def close(self) -> None: ...


# TODO: Badge must match Renderable by shape only, without inheriting from it.
class Badge(Renderable):
    """A label in brackets; matches Renderable by shape, without inheriting from it."""

    def __init__(self, label: str) -> None:
        self.label = label

    def render(self) -> str:
        return f"[{self.label}]"


# TODO: render every item that satisfies Renderable, not only Badges, and skip the others.
def render_all(items: Iterable[object]) -> list[str]:
    """Render every Renderable item in order and skip the others."""
    return [item.render() for item in items if isinstance(item, Badge)]


def close_all(resources: Iterable[object]) -> int:
    """Close every Closeable resource in order and return how many were closed."""
    closed = 0
    for resource in resources:
        if isinstance(resource, Closeable):
            resource.close()
            closed += 1
    return closed
