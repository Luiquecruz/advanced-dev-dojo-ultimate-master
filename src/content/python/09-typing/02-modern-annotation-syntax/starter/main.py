from typing import Dict, List, Optional


# TODO: replace the legacy typing aliases with builtin generics and `X | None`.
def count_words(items: List[str], limit: Optional[int] = None) -> Dict[str, int]:
    """Count each word; with a limit, keep only the first `limit` distinct words."""
    counts = {}
    for item in items:
        if item not in counts and limit is not None and len(counts) >= limit:
            continue
        counts[item] = counts.get(item, 0) + 1
    return counts


# TODO: annotate users (int ids to names), user_id and the result (a name or None).
def find_user(users, user_id):
    """Return the name stored for user_id, or None."""
    return users.get(user_id)


# TODO: annotate values, transform (a function from int to int) and the result.
def apply_all(values, transform):
    """Apply transform to every value."""
    return [transform(value) for value in values]


# TODO: annotate base, each extra override, the keyword-only strict flag and the result.
def merge(base, *overrides, strict=False):
    """Merge overrides into a copy of base; with strict, unknown keys raise KeyError."""
    merged = dict(base)
    for override in overrides:
        for key, value in override.items():
            if strict and key not in merged:
                raise KeyError(key)
            merged[key] = value
    return merged


class Node:
    # TODO: annotate the name and children attributes in the class body.

    def __init__(self, name: str) -> None:
        self.name = name
        self.children = []

    # TODO: annotate add so that child and the result are "the same class as self".
    def add(self, child):
        """Attach child and return self, so calls can be chained."""
        self.children.append(child)
        return self
