Repair three pieces of a pricing module in `main.py`.

## `MISSING` and `lookup(mapping, key, default=MISSING)`

`MISSING` is a module-level sentinel created with `object()`.

- If `key` is in `mapping`, return its value (including falsy values such as `0`).
- If the key is absent and no default was given (`default is MISSING`), raise `KeyError(key)`.
- If the key is absent and a default was given, return it. `lookup({}, "k", None)` returns `None`.

## `Money(amount, currency)`

`amount` is an integer number of cents and `currency` a string. Implement:

- `__eq__`: equal when both amount and currency match. Comparing with something that is not a `Money` must return `NotImplemented`, so `Money(1, "EUR") == 1` is `False` without raising.
- `__hash__`: consistent with `__eq__`, so equal objects hash equal and can live in a `set`.

## `same_amount(first, second)`

Return `True` when the two `Money` have the same `amount`, regardless of currency. Compare values with `==`.

The tests also read your source: it must not compare with `None` using `==`/`!=`, and must not use `is` against number or string literals.
