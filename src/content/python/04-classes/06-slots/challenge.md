Make three classes in `main.py` use slots instead of a per-instance `__dict__`.

## `class Point3D(x, y, z=0.0)`

- Declares `__slots__` with exactly `x`, `y` and `z`.
- Instances have no `__dict__`; assigning an unknown attribute (`point.w = 4`) raises `AttributeError`.
- `z` defaults to `0.0` through the `__init__` parameter, not a class attribute.

## `class ColorPoint3D(Point3D)` taking `(x, y, z, color)`

- Stays slotted: its instances have no `__dict__` either and reject unknown attributes.
- Its own `__slots__` declares **only** the slot it adds, `color`.

## `@dataclass class Pixel`

Fields `x: int`, `y: int`, `color: str = "black"`.

- Still a dataclass with the generated `__init__`, `__repr__` and `__eq__`.
- Instances have no `__dict__` and reject unknown attributes.

The tests also check that a subclass of `Point3D` with no `__slots__` gets a `__dict__` back, so you can see what the child without its own slots would do.
