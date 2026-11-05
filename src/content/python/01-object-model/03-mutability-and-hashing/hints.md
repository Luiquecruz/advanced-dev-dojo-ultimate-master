`freeze` is recursive. Handle scalars first and return them as they are, then branch on the container type, freezing each child before wrapping: `tuple([freeze(item) for item in value])`.
---
For a dict, build `frozenset([(key, freeze(item)) for key, item in value.items()])`. Sets of pairs ignore order, which is why `{"a": 1, "b": 2}` equals `{"b": 2, "a": 1}` after freezing.
---
`cache_key` needs no logic of its own: freeze the tuple of positional arguments, freeze the dict of keyword arguments, and return both in a tuple. Try it as a key: `cache = {}; cache[cache_key(([1, 2],), {})] = "done"`.
