`freeze` is recursive. Handle scalars first and return them as they are, then branch on the container type, freezing each child before wrapping: `tuple(freeze(item) for item in value)`.
---
For a dict, build `frozenset((key, freeze(item)) for key, item in value.items())`. Sets of pairs ignore order, which is why `{"a": 1, "b": 2}` equals `{"b": 2, "a": 1}` after freezing.
---
In `memoize_by_value`, the cache is an ordinary dict whose key is `(freeze(args), freeze(kwargs))`. Keep a `calls` attribute on the wrapper: `wrapper.calls = 0` before returning it, and increment it only on a cache miss.
