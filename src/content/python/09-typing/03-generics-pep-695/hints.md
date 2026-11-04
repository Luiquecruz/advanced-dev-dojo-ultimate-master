Delete the module-level `TypeVar`s and the `Generic` base: write `def first[T](...)`, `class Stack[T]:` and `class Box[T: (int, str)]:`. Old-style generics leave `__type_params__` empty, which is what the tests see now.
---
`return item or default` replaces a falsy first item with the default. Return `item` itself. For the stack, a list created in the class body is shared by every instance; create it in `__init__`, and let `peek` check for an empty list first.
---
`Pair = tuple` is only a variable. Write `type Pair[T] = tuple[T, T]`: a tuple of exactly two, not `list[T]`. And `T: int | str` would be a bound; the parenthesised tuple `(int, str)` makes it a constraint list.
