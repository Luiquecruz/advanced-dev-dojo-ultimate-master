Compare and hash the same tuple: `(self.cents, self.currency)`. Defining `__eq__` without `__hash__` makes the class unhashable, so the set test fails with `TypeError`.
---
`NotImplemented` is returned, not raised. Start `__eq__`, `__lt__` and `__add__` with `if not isinstance(other, Money): return NotImplemented`, then check the currency and raise `TypeError` when it differs.
---
`__format__(self, spec)` can delegate: `format(self.cents / 100, spec or ".2f")` plus the code. `sum(items)` first computes `0 + items[0]`, so `__radd__` returns `self` when `other == 0` and `NotImplemented` otherwise.
