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

From those five methods the ABC provides `get`, `pop`, `popitem`, `clear`, `update`, `setdefault`, `keys`, `values`, `items`, `__contains__` and `__eq__`, all routed through **your** `__getitem__` and `__setitem__`.

## Why not subclass `dict`?

`dict` is implemented in C. Several of its methods do not call your overridden `__getitem__` or `__setitem__`:

```py
class BadLowerDict(dict):
    def __setitem__(self, key, value):
        super().__setitem__(key.lower(), value)

d = BadLowerDict()
d.update({"Content-Type": 1})     # bypasses __setitem__
print(list(d))                    # ['Content-Type']  not lowercased
```

`update`, `setdefault`, `__init__` and others work directly on the C structure. An ABC-based mapping routes every operation through the methods you defined, so one rule (case-insensitive keys) applies everywhere.

## Coming from TypeScript and JavaScript

```ts
const headers = new Proxy({}, { get: (t, k) => t[String(k).toLowerCase()] });
```

- JavaScript reaches for `Proxy` or `Map` wrappers. Python expresses the same idea as a protocol with a ready-made base class.
- `Headers` in the Fetch API is case-insensitive by design; in Python you build that behavior yourself, as many HTTP libraries do.

## Design notes

- Store the **original-cased key** next to the value (`{lower: (original, value)}`) when users expect to see the key they wrote.
- Make iteration yield what users expect, and keep `__len__` consistent with it.
- Keep your own state private; do not expose the inner dict.
- Provide `__repr__` and `copy()` for debugging and convenience.

## When to choose it

- **`MutableMapping`** for any dict-like type with custom key rules, storage or validation.
- **`Mapping`** for a read-only mapping.
- **Subclass `dict`** only when you add methods without changing how items are stored or looked up.
- **A plain `dict` with normalization at the boundary** (`key.lower()` where keys enter) when one place is enough.
