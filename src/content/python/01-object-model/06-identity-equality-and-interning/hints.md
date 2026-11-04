A fresh `object()` can never equal any value a caller passes in, so `default is MISSING` tells "no default given" apart from `default=None`. Check `key in mapping` first instead of using `mapping.get(key)`, which cannot tell a missing key from a stored `None`.
---
`__eq__` should start with `if not isinstance(other, Money): return NotImplemented`. Then compare tuples: `(self.amount, self.currency) == (other.amount, other.currency)`.
---
Defining `__eq__` removes the inherited `__hash__`. Add `__hash__` returning `hash((self.amount, self.currency))` so equal objects hash equal and the class is usable in sets and as dict keys.
