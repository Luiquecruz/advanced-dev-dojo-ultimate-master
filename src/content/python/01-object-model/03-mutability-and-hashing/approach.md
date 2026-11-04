1. List the types `freeze` accepts and write the scalar case first so recursion has a base.
2. Add one branch per container type, freezing children before wrapping them.
3. Raise `TypeError` with `type(value).__name__` for everything else, so unsupported values fail loudly.
4. In `memoize_by_value`, decide the key: frozen positional args plus frozen keyword args.
5. Count real executions on cache misses only and expose the count as `wrapper.calls`.
6. Check that equal-looking lists produce the same key and that your input structures stay unchanged.
