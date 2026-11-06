Some functions return different types depending on their arguments. **`@overload`** lets you tell the checker each combination, and **narrowing** lets it follow your `if`s and `match`es to know which type a value has in each branch.

```py
from typing import Literal, overload

@overload
def load(path: str, binary: Literal[True]) -> bytes: ...
@overload
def load(path: str, binary: Literal[False] = ...) -> str: ...
def load(path: str, binary: bool = False) -> bytes | str:
    data = b"raw bytes"                          # stands in for reading a file
    return data if binary else data.decode()

print(load("a.txt"), load("a.txt", True))         # raw bytes b'raw bytes'
```

The checker picks the first matching overload, so `load("a.txt")` is a `str` for it and `load("a.txt", True)` is `bytes`. At runtime only the last, undecorated `def` exists as `load`.

## How it works

- **Overloads do not dispatch.** Giving each `@overload` a real body does nothing useful: the decorator throws the body away, and if no plain implementation follows, calling the function raises `NotImplementedError`. For runtime dispatch by type, use `functools.singledispatch` (module 03).
- `@overload` stores each stub in a registry and returns a placeholder; `typing.get_overloads(func)` (Python 3.11) returns the stubs, whose annotations you can inspect with `get_type_hints`. The final function needs annotations broad enough for every overload.
- Checkers narrow on `isinstance`, `is None`, `==` with literals, `match` patterns and `callable`. A custom predicate returns **`TypeIs[T]`** (PEP 742, Python 3.13): when it returns `True` the argument is narrowed to `T`, when `False` it is narrowed to "not `T`".
- **`TypeGuard[T]`** (PEP 647, 3.10) narrows only the `True` branch and allows `T` that is not a subtype of the input, such as `list[object]` → `list[str]`. Prefer `TypeIs` unless you need that.
- `assert_never(arg)` takes the bottom type `Never`. After every variant has been handled, the remaining type is `Never`, so the checker accepts the call; a missing branch makes it an error. At runtime it raises `AssertionError("Expected code to be unreachable, but got: ...")`, and because it is a function rather than an `assert` statement, `python -O` does not remove it.
- `typing.cast(T, value)` returns `value` unchanged. It only tells the checker to trust you: never a conversion or a check.
- **Exhaustiveness is checked at runtime too.** A `match` with a `case _: return "unknown"` hides a new event type sent by another service. `assert_never` in the fallback fails loudly instead.

Pitfalls:

- A `TypeIs` function that lies (returns `True` for a tuple) makes the checker trust wrong code; its body is the only runtime truth.
- Overload order matters for the checker: put the narrow signatures before the broad ones.

## Common mistakes

**Checking only the items and not the container.** A guard whose body is `all(isinstance(item, ...) for item in value)` accepts anything iterable whose items match: an empty string, an empty dict, a tuple, and for strings even `"abc"`, which is an iterable of one-character strings. A `TypeIs[list[...]]` guard with that body makes the checker trust a lie.

```py
# wrong: is_int_list((1, 2)) and is_int_list({}) are True
def is_int_list(value: object) -> TypeIs[list[int]]:
    return all(isinstance(item, int) for item in value)

# right: check the container first, then the items
def is_int_list(value: object) -> TypeIs[list[int]]:
    return isinstance(value, list) and all(isinstance(item, int) for item in value)
```

`get_overloads` and `assert_never` exist from Python 3.11 and `TypeIs` from 3.13; libraries supporting older versions import them from `typing_extensions`.

## When to choose it

- **`@overload`** when the return type depends on a literal flag or on the argument type and callers benefit from the precise type; not when one union return is honest enough.
- **`TypeIs`** for reusable checks such as "is this a list of strings", instead of repeating `isinstance` chains.
- **`assert_never`** at the end of every `match` or `if` chain over a closed union, so a new variant is an error both for the checker and at runtime.
- **A runtime check, not `cast`**, when the value comes from outside the program.
