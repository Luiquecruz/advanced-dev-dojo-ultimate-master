1. Decide what defines the value: cents and currency together. Every comparison, the hash and the repr follow from that pair.
2. Write `__repr__`, `__str__` and `__format__`, keeping the formatting logic in one place and reusing it.
3. Write `__eq__` and `__hash__` over the same pair, returning `NotImplemented` for foreign types.
4. Write `__lt__` with the same guard plus a currency check, and let `total_ordering` derive the rest.
5. Write `__add__` (guard, currency check, new object) and `__radd__` for the `0` that `sum` starts from.
6. Add `__bool__`, then try each operator with a foreign operand and confirm Python, not your code, raises the `TypeError`.
