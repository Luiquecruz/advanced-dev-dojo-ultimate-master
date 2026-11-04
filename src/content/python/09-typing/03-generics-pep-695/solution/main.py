from collections.abc import Iterable


def first[T](items: Iterable[T], default: T | None = None) -> T | None:
    """Return the first item of items, or default when there is none."""
    for item in items:
        return item
    return default


class Stack[T]:
    """A last-in, first-out stack."""

    def __init__(self) -> None:
        self._items: list[T] = []

    def push(self, item: T) -> None:
        self._items.append(item)

    def pop(self) -> T:
        if not self._items:
            raise IndexError("pop from an empty stack")
        return self._items.pop()

    def peek(self) -> T | None:
        return self._items[-1] if self._items else None

    def __len__(self) -> int:
        return len(self._items)


type Pair[T] = tuple[T, T]


def swap[T](pair: Pair[T]) -> Pair[T]:
    """Return the pair in reverse order."""
    left, right = pair
    return right, left


class Box[T: (int, str)]:
    """Holds an int or a str; doubled keeps the exact type it holds."""

    def __init__(self, value: T) -> None:
        self.value = value

    def doubled(self) -> T:
        return self.value * 2
