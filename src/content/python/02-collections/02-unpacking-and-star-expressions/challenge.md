Write three small helpers in `main.py` that rely on unpacking.

## `split_ends(items)`

Return a tuple `(first, middle, last)` for any iterable with at least two items: `middle` is a **list** of everything between them (possibly empty). Fewer than two items raises `ValueError`. It must also work for a generator, which cannot be indexed.

## `merge_layers(*layers, **overrides)`

`*layers` collects every positional argument into a tuple and `**overrides` every keyword argument into a dict: `merge_layers(a, b, c=3)` receives `layers == (a, b)` and `overrides == {"c": 3}`.

Return a **new** dict built from the layer dicts, left to right: later layers win. The keyword `overrides` are applied last. None of the layers is modified.

## `swap_pairs(pairs)`

Return a list of tuples where every pair `(a, b)` of the iterable `pairs` becomes `(b, a)`. A pair may be any two-item iterable (a list works too); an item with any other number of values raises `ValueError`, which unpacking gives you for free.

Use unpacking; do not index into the items.
