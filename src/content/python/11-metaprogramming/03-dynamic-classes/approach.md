1. Treat the class as data: a name, a tuple of bases and a namespace dict. Everything the tests check (name, slots, match support, methods) is an entry in that dict or an argument of `type()`.
2. Freeze the field list into a tuple once and validate it before building anything, so a bad header fails when the class is made, not on the first row.
3. Write `__init__` as binding: positional values fill fields in order, keywords fill the rest, and each conflict (too many, unknown, repeated, missing) raises `TypeError` naming the field.
4. Make equality depend on the exact class, and return `NotImplemented` for other types so Python can try the other side and then fall back to `False`.
5. Put `__slots__` and `__match_args__` in the namespace, then call `type(name, (), namespace)` with the requested name.
6. Compare with `collections.namedtuple` in the demo: same repr style, but a namedtuple is a tuple, equal to `("A-1", 3)`, and immutable.
