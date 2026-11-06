1. List the types `freeze` accepts and write the scalar case first so recursion has a base.
2. Add one branch per container type, freezing children before wrapping them.
3. Raise `TypeError` with `type(value).__name__` for everything else, so unsupported values fail loudly.
4. Check one nested value by hand: after freezing, no `list`, `dict` or `set` may remain at any level.
5. Build `cache_key` from `freeze` alone, so the positional and keyword arguments follow the same rules.
6. Check that equal-looking lists produce equal keys, that keyword order does not matter, and that your input structures stay unchanged.
