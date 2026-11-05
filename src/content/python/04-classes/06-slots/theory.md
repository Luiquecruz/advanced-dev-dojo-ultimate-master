By default every instance carries a `__dict__`, a full dictionary for its attributes. `__slots__` replaces it with a fixed set of named slots stored directly in the object.

```py
class Point:
    __slots__ = ("x", "y")

    def __init__(self, x, y):
        self.x = x
        self.y = y

p = Point(1, 2)
p.x = 10            # fine
p.w = 3             # AttributeError: 'Point' object has no attribute 'w'
hasattr(p, "__dict__")   # False
```

Three effects follow:

- **Memory**: no per-instance dictionary. For millions of small objects this is the difference that matters; measure it with `tracemalloc` on your own data rather than trusting a number from a blog.
- **A closed attribute set**: a typo such as `p.xx = 1` raises instead of silently creating a new attribute.
- **Slightly faster attribute access**, because each slot is a descriptor on the class pointing at a fixed offset.

## How it works

For each name in `__slots__`, the class gets a **member descriptor** (`Point.__dict__["x"]`), a data descriptor that reads and writes a fixed slot in the instance. There is no instance namespace to fall back to, so unknown names fail.

- A value written in the class body is a *class attribute*, not a per-instance default. Next to `__slots__ = ("x", "y", "z")`, a line `z = 0` fails at class creation with `ValueError: 'z' in __slots__ conflicts with class variable`. Put defaults in the `__init__` parameters.
- Add `"__dict__"` to `__slots__` to allow extra attributes again, or `"__weakref__"` when instances must be weakly referenceable.
- Repeating a parent's slot name in a child wastes space and hides the parent slot.
- `vars(p)` fails on a slotted object; `copy`, `pickle` and `dataclasses.asdict` still work.
- Multiple inheritance from two bases that both have non-empty slots raises `TypeError: multiple bases have instance lay-out conflict`. Mixins meant to be combined should declare `__slots__ = ()`.

## Common mistakes

**Assuming a subclass inherits the restriction.** A subclass that does not declare `__slots__` gets a `__dict__` back, and with it the memory cost and the open attribute set. Each class in the chain declares `__slots__`, listing **only the names it adds**:

```py
# wrong: ColorPoint instances have a __dict__ again, so point.colour = "red" is accepted
class ColorPoint(Point):
    def __init__(self, x, y, color):
        super().__init__(x, y)
        self.color = color

# right: x and y already come from Point
class ColorPoint(Point):
    __slots__ = ("color",)

    def __init__(self, x, y, color):
        super().__init__(x, y)
        self.color = color
```

## Slotted dataclasses

```py
from dataclasses import dataclass

@dataclass(slots=True)
class Pixel:
    x: int
    y: int
    color: str = "black"
```

`slots=True` builds a new class with `__slots__` generated from the fields, and defaults keep working because the dataclass moves them into `__init__`.

> **Status as of November 2026:** `@dataclass(slots=True)` exists since Python 3.10, and since 3.11 fields already slotted in a base class are not repeated. The current release is Python 3.15; this track runs Python 3.14 in Pyodide.

## When to choose it

- **`__slots__`** for classes with many instances and a fixed set of attributes: records, points, line items, nodes.
- **`@dataclass(slots=True)`** when the class is mostly data; it writes the slots for you.
- **Mixins** combined with slotted classes declare `__slots__ = ()`.
- **Keep `__dict__`** for classes with few instances, classes that need dynamic attributes, or code that relies on `vars()` and monkey-patching in tests.
