from collections.abc import Callable
from typing import Self


def count_words(items: list[str], limit: int | None = None) -> dict[str, int]:
    """Count each word; with a limit, keep only the first `limit` distinct words."""
    counts: dict[str, int] = {}
    for item in items:
        if item not in counts and limit is not None and len(counts) >= limit:
            continue
        counts[item] = counts.get(item, 0) + 1
    return counts


def find_user(users: dict[int, str], user_id: int) -> str | None:
    """Return the name stored for user_id, or None."""
    return users.get(user_id)


def apply_all(values: list[int], transform: Callable[[int], int]) -> list[int]:
    """Apply transform to every value."""
    return [transform(value) for value in values]


def merge(base: dict[str, int], *overrides: dict[str, int], strict: bool = False) -> dict[str, int]:
    """Merge overrides into a copy of base; with strict, unknown keys raise KeyError."""
    merged = dict(base)
    for override in overrides:
        for key, value in override.items():
            if strict and key not in merged:
                raise KeyError(key)
            merged[key] = value
    return merged


class Node:
    name: str
    children: list[Self]

    def __init__(self, name: str) -> None:
        self.name = name
        self.children = []

    def add(self, child: Self) -> Self:
        """Attach child and return self, so calls can be chained."""
        self.children.append(child)
        return self
