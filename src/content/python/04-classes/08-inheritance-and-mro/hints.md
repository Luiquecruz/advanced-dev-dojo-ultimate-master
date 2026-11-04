`Entity.save(self, log)` jumps straight to the base and skips the other mixins. `super().save(log)` asks the MRO of the actual object for the next class, which may be another mixin.
---
The MRO keeps the left-to-right order of the bases you write. To run Validation, then Audit, then Timestamp, list them in that order in the `class Order(...)` statement.
---
Every class has `__mro__`, a tuple of classes from the class itself to `object`. `linearize` only needs their `__name__`s.
