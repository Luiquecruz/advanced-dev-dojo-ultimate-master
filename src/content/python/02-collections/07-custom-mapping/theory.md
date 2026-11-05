A **mapping** is anything with key lookup. The easiest correct way to build one is to subclass `collections.abc.MutableMapping`, implement five methods and receive the rest for free.

```py
from collections.abc import MutableMapping

class LowerDict(MutableMapping):
    def __init__(self):
        self._data = {}

    def __getitem__(self, key):
        return self._data[key.lower()]

    def __setitem__(self, key, value):
        self._data[key.lower()] = value

    def __delitem__(self, key):
        del self._data[key.lower()]

    def __iter__(self):
        return iter(self._data)

    def __len__(self):
        return len(self._data)
```

## How it works

`MutableMapping` is an **abstract base class**: it declares the five methods above as abstract, so instantiating a subclass that misses one raises `TypeError`. From those five methods the ABC provides `get`, `pop`, `popitem`, `clear`, `update`, `setdefault`, `keys`, `values`, `items`, `__contains__` and `__eq__`, all routed through **your** `__getitem__` and `__setitem__`. One rule written once, such as lowercasing the key, therefore applies to every operation.

`__iter__` must return an **iterator**, the object a `for` loop pulls items from one at a time. `iter(self._data)` asks the inner dict for one, and a dict's iterator yields its keys, so `for key in headers` walks the stored keys in insertion order.

Design notes:

- Store the **original-cased key** next to the value (`{lower: (original, value)}`) when users expect to see the key they wrote.
- Make iteration yield what users expect, and keep `__len__` consistent with it.
- Keep your own state private; do not expose the inner dict.
- Provide `__repr__` and `copy()` for debugging and convenience.

## Common mistakes

**Subclassing `dict` to change how keys are stored.** `dict` is implemented in C, and several of its methods (`update`, `setdefault`, `get`, the constructor) work directly on its internal table without calling your overridden `__getitem__` or `__setitem__`, so the rule is silently skipped:

```py
class BadLowerDict(dict):         # wrong: dict methods bypass the override
    def __setitem__(self, key, value):
        super().__setitem__(key.lower(), value)

d = BadLowerDict()
d.update({"Content-Type": 1})     # bypasses __setitem__
print(list(d))                    # ['Content-Type']  not lowercased

class LowerDict(MutableMapping):  # right: every operation goes through your methods
    ...
```

## When to choose it

- **`MutableMapping`** for any dict-like type with custom key rules, storage or validation.
- **`Mapping`** for a read-only mapping.
- **Subclass `dict`** only when you add methods without changing how items are stored or looked up.
- **A plain `dict` with normalization at the boundary** (`key.lower()` where keys enter) when one place is enough.
