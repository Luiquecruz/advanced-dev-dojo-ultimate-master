A **generic** names a type that is chosen at each use. Since Python 3.12 (PEP 695) the type parameters sit in square brackets right after the name, for functions, classes and type aliases:

```py
def last[T](items: list[T]) -> T:
    return items[-1]

class Registry[K, V]:
    def __init__(self) -> None:
        self._entries: dict[K, V] = {}

type Mapping2D[T] = dict[str, dict[str, T]]

print(last.__type_params__)        # (T,)
print(Registry.__type_params__)    # (K, V)
print(Mapping2D.__value__)         # dict[str, dict[str, T]]
```

`T`, `K` and `V` are real `TypeVar` objects created for that definition only. A checker uses them to connect a parameter with a result (`last([1, 2])` is an `int`); runtime code can inspect them.

## How it works

The same three forms cover most code:

```py
from collections.abc import Iterable

def first[T](items: Iterable[T], default: T | None = None) -> T | None: ...
class Stack[T]: ...
type Pair[T] = tuple[T, T]        # exactly two items; list[T] would be any length
class Box[T: (int, str)]: ...
```

- **Bound or constraints.** `T: int | str` is an upper **bound**: any subtype of `int | str`, including the union itself, so a `Box[int | str]` is allowed and `doubled()` is typed `int | str`. `T: (int, str)` is a **constraint** list: `T` is exactly `int` or exactly `str`, and the result keeps that exact type. At runtime the first sets `__bound__`, the second `__constraints__`.
- **Parameters stay objects.** `Stack[int]` is a real object; calling it creates a normal `Stack` and records `__orig_class__`, but nothing checks that you push `int`s.
- Each `[T]` list is evaluated in its own scope; the `TypeVar` objects land in `__type_params__`. A PEP 695 class implicitly inherits `typing.Generic`, so `Stack[int]` works without writing `Generic[T]`.
- Bounds, constraints and alias values are **lazy**: `class Node[T: Tree]` or `type Tree = dict[str, Tree | int]` may refer to names defined later; they are evaluated when you first read `__bound__` or `__value__`.
- Variance is **inferred** by checkers for PEP 695 parameters (`T.__infer_variance__` is `True`); with `TypeVar` you had to write `covariant=True`.
- `*Ts` declares a `TypeVarTuple` (PEP 646) and `**P` a `ParamSpec` (PEP 612), the tools for typing decorators that preserve signatures.
- **Defaults** (PEP 696, Python 3.13): `class Page[T, Cursor = int]` lets users write `Page[str]`, which becomes `Page[str, int]`; `Page.__type_params__[1].__default__` is `int`.

## Common mistakes

**A bound written where a constraint list was meant.** `T: int | str` and `T: (int, str)` look alike, and both accept an `int` or a `str` at runtime, because nothing is checked. The difference shows to a checker and to introspection. Under the bound, a checker reads `self.value * 2` as `int | str`, which is not `T`, so `def doubled(self) -> T` is reported as an error; under constraints it checks the body once for `int` and once for `str`. At runtime `__constraints__` stays empty.

```py
# wrong: a bound; T may be the union int | str
class Box[T: int | str]: ...
Box.__type_params__[0].__constraints__   # ()

# right: a constraint list; T is exactly int or exactly str
class Box[T: (int, str)]: ...
Box.__type_params__[0].__constraints__   # (int, str)
```

Two runtime slips sit next to it: `return item or default` replaces a first item of `0` or `""` with the default, and a list created in the class body (`items: list[T] = []`) is shared by every instance.

## Legacy vs modern

```py
from typing import Generic, TypeVar, TypeAlias

T = TypeVar("T")                      # module-level, shared by every generic that uses it
Scalar = TypeVar("Scalar", int, str)  # constraints

class Stack(Generic[T]): ...          # __type_params__ == ()
Pair: TypeAlias = tuple[T, T]         # just a variable holding a GenericAlias
```

The old spelling still works and checkers accept it, but `__type_params__` is empty, the `TypeVar` leaks into the module namespace, and the alias is an ordinary variable instead of a lazy `TypeAliasType`.

PEP 695 syntax needs Python 3.12 or newer and PEP 696 defaults need 3.13; `typing.TypeAlias` has been deprecated in favor of the `type` statement since 3.12. Libraries that still support 3.11 keep `TypeVar` (or `typing_extensions.TypeVar(..., default=...)`) until they drop it.

## When to choose it

- **PEP 695 syntax** for every new generic when the minimum supported Python is 3.12; it scopes the parameters to the definition and keeps them inspectable.
- **Constraints** `T: (A, B)` when the result must keep the exact input type (like `str` vs `bytes`); a **bound** `T: Base` when any subtype is fine.
- **`TypeVar`** only while you still support Python 3.11 or older.
- **No generic** when a function works on one concrete type: `def total(prices: list[float]) -> float` says more than `[T]`.
