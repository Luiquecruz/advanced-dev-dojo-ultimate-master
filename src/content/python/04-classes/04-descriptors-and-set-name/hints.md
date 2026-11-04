One descriptor object is shared by every instance of the class. Anything stored on `self` inside `__get__`/`__set__` is shared too. Store values in `instance.__dict__[self.name]`, and return `self` from `__get__` when `instance is None`.
---
`LazyAttribute` must not define `__set__`. Then a value placed in `instance.__dict__` under the same name shadows the descriptor: write the computed value there on first access and Python stops calling `__get__` for that instance.
---
`__set_name__(self, owner, name)` receives the attribute name when the class body finishes; use it in the error messages. For `fields()`, walk `reversed(cls.__mro__)`, read each `vars(klass)` in order, and keep the names whose value is a `Field`, skipping duplicates.
