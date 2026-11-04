Mark the keys with the qualifiers from `typing`: `id: ReadOnly[int]` and `tags: NotRequired[list[str]]`. Then print `UserPayload.__required_keys__`, `__optional_keys__` and `__readonly_keys__` to confirm the sets.
---
Drive the loop with `get_type_hints(schema).items()`: it gives every declared key in order, with `ReadOnly`/`NotRequired` already stripped. Whether an absent key is an error depends on `key in schema.__required_keys__`, not on the hints.
---
Split annotations with `get_origin` and `get_args`: `get_origin(Literal["a"]) is Literal`, `get_origin(list[str]) is list` with `get_args(...) == (str,)`. For `int`, check `isinstance(value, int) and not isinstance(value, bool)`. Raise `TypeError` when none of the cases applies.
