1. List the attributes each class really stores: `x`, `y`, `z` for the point, plus `color` for the child, plus the three dataclass fields.
2. Declare `__slots__` on `Point3D` with its three names and keep the default value in the `__init__` signature.
3. Check the child with `hasattr(point, "__dict__")`: it is true until the child declares its own slots. Add only the new name.
4. Turn `Pixel` into a slotted dataclass with the decorator option and confirm the default still applies.
5. Try assigning a misspelled attribute on each class and confirm it now raises `AttributeError`.
