Build two helpers in `main.py` that turn unhashable data into cache keys.

## `freeze(value)`

Return a **hashable, immutable** equivalent of `value`:

- `int`, `float`, `bool`, `str`, `bytes`, `None`: returned unchanged.
- `list` and `tuple`: a `tuple` whose items are frozen recursively.
- `set` and `frozenset`: a `frozenset` of the frozen items.
- `dict`: a `frozenset` of `(key, frozen_value)` pairs, so two dicts with the same items freeze equal regardless of insertion order.
- Any other type raises `TypeError` and the message contains the type name (for example `Widget`).

`freeze` never modifies its input.

## `memoize_by_value(function)`

Return a wrapper that caches results by the **values** of the arguments, so calls with equal lists or dicts reuse the cache:

- The key is built from `freeze(args)` and `freeze(kwargs)`.
- The wrapper has an attribute `calls`: how many times the real `function` ran.
- Positional and keyword arguments both take part in the key.
