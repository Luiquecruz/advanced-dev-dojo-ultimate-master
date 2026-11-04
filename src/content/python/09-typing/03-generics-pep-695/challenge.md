`main.py` was written for Python 3.11 with module-level `TypeVar`s, and it has bugs. Rewrite every generic with the PEP 695 syntax and fix the behavior. The tests read `__type_params__`, `__value__`, `__constraints__` and `__bound__`, which only the new syntax fills in.

## `first[T](items, default=None)`

- Declared as `def first[T](...)`, so `first.__type_params__` holds one parameter.
- `items` is any iterable, including a generator. Return its first item, **even when that item is falsy** (`0`, `""`), or `default` (which defaults to `None`) when it is empty.

## `class Stack[T]`

- Declared as `class Stack[T]`, so `Stack.__type_params__` holds one parameter, and `Stack[int]()` returns an ordinary `Stack` (nothing checks the element type at runtime).
- `push(item)` adds on top. `pop()` removes and returns the top item and raises `IndexError` when the stack is empty. `peek()` returns the top item without removing it, or `None` when empty. `len(stack)` is the number of items.
- Every instance has its own items.

## `type Pair[T]` and `swap(pair)`

- A `type` statement: `Pair` is a `typing.TypeAliasType` with one type parameter, and `Pair.__value__` is `tuple[T, T]` for that parameter.
- `swap(pair)` returns the pair reversed: `swap((1, 2)) == (2, 1)`.

## `class Box[T: (int, str)]`

- `T` is **constrained** to exactly `int` or exactly `str`: `Box.__type_params__[0].__constraints__ == (int, str)` and its `__bound__` is `None`.
- `Box(value)` stores `value`; `doubled()` returns `value * 2` (`42` for `21`, `"abab"` for `"ab"`).
