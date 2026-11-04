The functions in `main.py` already work. Annotate them so that `typing.get_type_hints` returns exactly the types below. No checker runs here: the tests read the annotation objects, the same way `dataclasses` or a web framework would.

Use modern syntax only: builtin generics (`list[str]`, `dict[str, int]`), `X | None`, `Callable` from `collections.abc` and `Self` from `typing`. The module must not use `typing.List`, `Dict`, `Set`, `Tuple`, `Optional`, `Union` or `typing.Callable` (checked on the syntax tree, so comments are fine).

## `count_words(items, limit=None)`

`get_type_hints(count_words) == {"items": list[str], "limit": int | None, "return": dict[str, int]}`. The starter uses the legacy aliases: rewrite them.

## `find_user(users, user_id)`

`{"users": dict[int, str], "user_id": int, "return": str | None}`.

## `apply_all(values, transform)`

`{"values": list[int], "transform": Callable[[int], int], "return": list[int]}`, with `Callable` imported from `collections.abc`.

## `merge(base, *overrides, strict=False)`

`{"base": dict[str, int], "overrides": dict[str, int], "strict": bool, "return": dict[str, int]}`. Every extra positional argument is one `dict[str, int]`.

## `class Node`

- Class body annotations: `get_type_hints(Node) == {"name": str, "children": list[Self]}`.
- `Node.add(child)`: `{"child": Self, "return": Self}`. It returns `self`, so calls chain.

The behavior of every function stays the same.
