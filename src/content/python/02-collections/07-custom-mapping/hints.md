Keep a private dict keyed by the **lowercase** key whose values are `(original_key, value)` pairs. `__getitem__` returns the value part; `__iter__` returns an iterator over the original keys, for example the generator expression `(original for original, _ in self._data.values())`, which stays lazy: `clear()` pulls one key at a time from `iter(self)`, and building a list on every pull would make it quadratic.
---
The constructor can call `self.update(initial)`: `update` comes from the ABC and goes through your `__setitem__`, so normalization lives in one place.
---
`__len__` is the length of the private dict. `copy()` is `CaseInsensitiveDict(self.items())`.
