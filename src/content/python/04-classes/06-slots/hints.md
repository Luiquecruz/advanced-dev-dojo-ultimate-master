`__slots__` is a class attribute holding a tuple of attribute names. Declaring it removes the instance `__dict__` for that class, but only if every class in the chain declares it.
---
A child lists only the names it adds: `__slots__ = ("color",)`. Writing no `__slots__` at all in the child brings `__dict__` back; repeating `x`, `y`, `z` wastes space.
---
Do not add `z = 0.0` to the class body: with `z` in `__slots__` that raises `ValueError` when the class is created. For `Pixel`, pass `slots=True` to the `@dataclass` decorator.
