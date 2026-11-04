Delete the `from typing import Dict, List, Optional` line and write the builtin spellings: `list[str]`, `dict[str, int]`, `int | None`. A default of `None` does not add `None` to the type; write it yourself.
---
`Callable` comes from `collections.abc`: `Callable[[int], int]` is "takes one int, returns an int". `Self` comes from `typing` and is used for both the `child` parameter and the result of `add`.
---
A `*overrides` annotation describes **one** extra argument, so it is `dict[str, int]`, not a list of them. The class attributes go in the class body as bare annotations: `name: str` and `children: list[Self]`.
