Build two helpers in `main.py` that turn unhashable data into cache keys.

## `freeze(value)`

Return a **hashable, immutable** equivalent of `value`:

- `int`, `float`, `bool`, `str`, `bytes`, `None`: returned unchanged.
- `list` and `tuple`: a `tuple` whose items are frozen recursively.
- `set` and `frozenset`: a `frozenset` of the frozen items.
- `dict`: a `frozenset` of `(key, frozen_value)` pairs, so two dicts with the same items freeze equal regardless of insertion order.
- Any other type raises `TypeError` and the message contains the type name (for example `Widget`).

`freeze` never modifies its input.

## `cache_key(args, kwargs)`

Return a hashable key for one function call, so a cache can recognize calls made with equal arguments:

- `args` is a tuple of positional arguments and `kwargs` a dict of keyword arguments, for example `cache_key(([1, 2],), {"scale": 2})`.
- The key is `(freeze(args), freeze(kwargs))`.
- Two calls with equal arguments give equal keys, whatever the order of the keyword arguments; different arguments give different keys.
