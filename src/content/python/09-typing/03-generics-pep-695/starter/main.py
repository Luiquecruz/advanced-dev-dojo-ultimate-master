from collections.abc import Iterable
from typing import Generic, TypeVar

T = TypeVar("T")
Scalar = TypeVar("Scalar", int, str)


# TODO: declare T with the PEP 695 syntax (`def first[T](...)`) and return the first item even when it is falsy.
def first(items: Iterable[T], default: T | None = None) -> T | None:
    """Return the first item of items, or default when there is none."""
    for item in items:
        return item or default
    return default


# TODO: declare the class as `Stack[T]` and give every instance its own list.
class Stack(Generic[T]):
    """A last-in, first-out stack."""

    items: list[T] = []

    def push(self, item: T) -> None:
        self.items.append(item)

    def pop(self) -> T:
        return self.items.pop()

    # TODO: return None when the stack is empty.
    def peek(self) -> T | None:
        return self.items[-1]

    def __len__(self) -> int:
        return len(self.items)


# TODO: a `type` statement declaring Pair[T] as a tuple of exactly two T.
Pair = tuple


def swap(pair: Pair) -> Pair:
    """Return the pair in reverse order."""
    left, right = pair
    return right, left


# TODO: declare the class as `Box[T: (int, str)]`: T is exactly int or exactly str.
class Box(Generic[Scalar]):
    """Holds an int or a str; doubled keeps the exact type it holds."""

    def __init__(self, value: Scalar) -> None:
        self.value = value

    def doubled(self) -> Scalar:
        return self.value * 2
