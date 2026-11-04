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

## Coming from TypeScript and JavaScript

The syntax is almost the same idea:

```ts
function first<T>(items: Iterable<T>, fallback?: T): T | undefined { ... }
class Stack<T> { private items: T[] = []; }
type Pair<T> = [T, T];
function double<T extends number | string>(value: T): T { ... }
```

```py
def first[T](items: Iterable[T], default: T | None = None) -> T | None: ...
class Stack[T]: ...
type Pair[T] = tuple[T, T]
class Box[T: (int, str)]: ...
```

Three habits break:

- **`T extends A | B` is not `T: (A, B)`.** TypeScript's `extends` is an upper **bound**, and Python has that too: `T: int | str` means "any subtype of `int | str`", including the union itself, so a `Box[int | str]` is allowed and `doubled()` returns `int | str`. `T: (int, str)` is a **constraint** list: `T` is exactly `int` or exactly `str`, and the result keeps that exact type. At runtime the first sets `__bound__`, the second `__constraints__`.
- **A TypeScript tuple is not a Python list.** `[T, T]` maps to `tuple[T, T]`; `list[T]` is any length.
- **`items[0] || fallback` returns the fallback for `0` or `""`.** Return the first item itself, and stop iterating; `items` may be a generator with no index.

Erasure differs too: TypeScript removes `<T>` entirely, while `Stack[int]` in Python is an object. Calling it creates a normal `Stack` and records `__orig_class__`, but nothing checks that you push `int`s.

## How it works

- Each `[T]` list is evaluated in its own scope; the `TypeVar` objects land in `__type_params__`. A PEP 695 class implicitly inherits `typing.Generic`, so `Stack[int]` works without writing `Generic[T]`.
- Bounds, constraints and alias values are **lazy**: `class Node[T: Tree]` or `type Tree = dict[str, Tree | int]` may refer to names defined later; they are evaluated when you first read `__bound__` or `__value__`.
- Variance is **inferred** by checkers for PEP 695 parameters (`T.__infer_variance__` is `True`); with `TypeVar` you had to write `covariant=True`.
- `*Ts` declares a `TypeVarTuple` (PEP 646) and `**P` a `ParamSpec` (PEP 612), the tools for typing decorators that preserve signatures.
- **Defaults** (PEP 696, Python 3.13): `class Page[T, Cursor = int]` lets users write `Page[str]`, which becomes `Page[str, int]`; `Page.__type_params__[1].__default__` is `int`.

## Legacy vs modern

```py
from typing import Generic, TypeVar, TypeAlias

T = TypeVar("T")                      # module-level, shared by every generic that uses it
Scalar = TypeVar("Scalar", int, str)  # constraints

class Stack(Generic[T]): ...          # __type_params__ == ()
Pair: TypeAlias = tuple[T, T]         # just a variable holding a GenericAlias
```

The old spelling still works and checkers accept it, but `__type_params__` is empty, the `TypeVar` leaks into the module namespace, and the alias is an ordinary variable instead of a lazy `TypeAliasType`.

> **Status as of November 2026:** PEP 695 syntax needs Python 3.12 or newer and PEP 696 defaults need 3.13; `typing.TypeAlias` has been deprecated in favor of the `type` statement since 3.12. Libraries that still support 3.11 keep `TypeVar` (or `typing_extensions.TypeVar(..., default=...)`) until they drop it.

## When to choose it

- **PEP 695 syntax** for every new generic when the minimum supported Python is 3.12; it scopes the parameters and reads like TypeScript.
- **Constraints** `T: (A, B)` when the result must keep the exact input type (like `str` vs `bytes`); a **bound** `T: Base` when any subtype is fine.
- **`TypeVar`** only while you still support Python 3.11 or older.
- **No generic** when a function works on one concrete type: `def total(prices: list[float]) -> float` says more than `[T]`.
