Keep a private dict keyed by the **lowercase** key whose values are `(original_key, value)` pairs. `__getitem__` returns the value part; `__iter__` yields the original keys.
---
The constructor can call `self.update(initial)`: `update` comes from the ABC and goes through your `__setitem__`, so normalization lives in one place.
---
`__len__` is the length of the private dict. `copy()` is `CaseInsensitiveDict(self.items())`.
