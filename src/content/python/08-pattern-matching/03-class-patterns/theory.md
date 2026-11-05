A **class pattern** looks like a constructor call but works in reverse: `Circle(radius=r)` checks that the subject is a `Circle`, then reads attributes from it. Nothing is constructed and `__init__` never runs.

```py
import math
from dataclasses import dataclass

@dataclass
class Circle:
    radius: float

@dataclass
class Rectangle:
    width: float
    height: float

def area(shape):
    match shape:
        case Circle(radius=r):          # keyword sub-pattern: reads shape.radius
            return math.pi * r**2
        case Rectangle(w, h):           # positional: Rectangle.__match_args__ == ("width", "height")
            return w * h
        case _:
            raise TypeError(f"unsupported shape: {type(shape).__name__}")
```

## How it works

For `case Cls(p1, p2, key=p3):` Python:

1. Checks `isinstance(subject, Cls)`, so instances of subclasses match too. Otherwise the case fails.
2. Maps the positional sub-patterns to attribute names through `Cls.__match_args__`, a tuple of strings. More positional sub-patterns than names raises `TypeError`.
3. Reads each attribute. An `AttributeError` makes the case fail quietly; any other exception propagates. Each value must then match its sub-pattern.

Positional sub-patterns do not follow the order of the constructor's parameters: `Click(x, y)` works only when `Click.__match_args__` says which attributes positions 1 and 2 mean. A plain class has no `__match_args__`, and the match raises `TypeError: Click() accepts 0 positional sub-patterns (2 given)` when it reaches that case. Keyword sub-patterns work on any class, with or without `__match_args__`. Positional ones come first, and a positional plus a keyword sub-pattern for the same attribute raise `TypeError`.

**Dataclasses generate `__match_args__`** (the `match_args` parameter, added in Python 3.10 and true by default) from the non-keyword-only parameters of the generated `__init__`, in field order. Fields marked `kw_only` or placed after `KW_ONLY` are left out, and a class that already defines `__match_args__` keeps its own. For a plain class, write it by hand and list only the attributes with a natural order:

```py
class Click:
    __match_args__ = ("x", "y")          # button is matched by keyword only

    def __init__(self, x, y, button="left"):
        self.x, self.y, self.button = x, y, button

match Click(3, 4, button="right"):
    case Click(x, y, button="left"):
        print("click", x, y)
    case Click(x, y, button=other):
        print(other, "click", x, y)       # right click 3 4
```

**Built-in types** `bool`, `bytearray`, `bytes`, `dict`, `float`, `frozenset`, `int`, `list`, `set`, `str` and `tuple` accept one positional sub-pattern that matches the **whole subject**: `case int(n):` binds the integer itself and `case str(text):` binds the string. `int()` also matches `True`, because `bool` is a subclass of `int`.

Pitfalls:

- Order matters with inheritance: `case Base():` placed before `case Derived():` catches the derived instances first.
- `__match_args__` is public API. Reordering it silently changes the meaning of every positional pattern written against the class.

## Common mistakes

**Writing `case Square:` without parentheses.** A bare name is a **capture pattern**, not a type check: it binds the subject to a new local variable called `Square` and matches every value. Followed by another case it is a `SyntaxError` ("name capture 'Square' makes remaining patterns unreachable"); as the last case it compiles and silently accepts anything:

```py
# wrong: area("hexagon") raises AttributeError instead of TypeError,
# and any object with a side attribute counts as a square
match shape:
    case Circle(radius=r):
        return math.pi * r**2
    case Square:
        return shape.side**2

# right: parentheses make it an isinstance check, and the wildcard refuses the rest
match shape:
    case Circle(radius=r):
        return math.pi * r**2
    case Square(side=s):
        return s**2
    case _:
        raise TypeError(f"unsupported shape: {type(shape).__name__}")
```

## When to choose it

- **Class patterns** for a closed set of value types decoded in one place: shapes, events, syntax tree nodes, especially when they nest (`case Line(Point(0, 0), end):`).
- **Keyword sub-patterns** for classes with many attributes or no obvious order; positional ones for small records such as points and most dataclasses.
- **A method on each class** when the set of types is open and adding a type should not mean editing a central `match`; `functools.singledispatch` when the classes belong to another package.
- **A plain `isinstance` check** when you need one type test and no attributes.
