Implement truthiness for two domain classes and two fallback helpers in `main.py`.

## `Basket(items=None)`

Wraps a list of items. It defines `__len__` only (no `__bool__`): an empty basket is falsy, a basket with items is truthy.

## `Quota(limit, used)`

An object that is truthy while capacity remains (`used < limit`) and falsy otherwise. Define `__bool__`. A quota has **no length**: `len(Quota(1, 0))` must raise `TypeError`.

## `coalesce(*values)`

`*values` collects every positional argument of the call into a tuple: `coalesce(None, 0, 5)` receives `values == (None, 0, 5)`, and `coalesce()` receives an empty tuple.

Return the first value that is **not `None`**, keeping falsy values such as `0`, `""`, `[]` and `False`. Return `None` when every value is `None` or no value is given.

## `first_truthy(*values, default=None)`

Return the first **truthy** value, or `default` when there is none. `default` comes after `*values`, so a caller can set it only by name: `first_truthy(0, "", default="d")`.
