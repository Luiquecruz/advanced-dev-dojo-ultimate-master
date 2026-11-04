1. List each generic in the starter and its old spelling: a module `TypeVar`, a `Generic[...]` base, an alias assigned to a variable.
2. Convert them one at a time to the bracket syntax, then print `__type_params__` (and `__value__` for the alias) to see what runtime code now sees.
3. Decide, for `Box`, whether the contract describes a bound or a constraint list; read what `__bound__` and `__constraints__` should hold.
4. Fix `first` for falsy items and for iterables without an index; try a list, a generator and an empty list.
5. Move the stack's storage into `__init__`, make `peek` safe on an empty stack and make `pop` raise `IndexError`.
6. Confirm `Stack[int]()` still creates a plain `Stack` and accepts any value: the parameter is for the checker, not a runtime guard.
