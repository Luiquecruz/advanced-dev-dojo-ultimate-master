An API client returns orders in pages, and a log tool reads lines from a stream that cannot be rewound. Build both kinds of iterable in `main.py`, plus two helpers that tell them apart. The starter makes the two classic mistakes: a `Paginator` that is its own cursor and a `LineReader` whose `__next__` returns `None` at the end.

## `class Paginator(pages)`

`pages` is a list of pages, each a list of items. Iterating a `Paginator` yields every item in page order, skipping empty pages.

- It is **re-iterable**: every `iter(paginator)` (and so every `for` loop) returns a **new, independent** iterator. Two loops in a row, or two nested loops, each see every item.
- `iter(paginator)` never returns the paginator itself, and the paginator stores no position. Put the position in a separate cursor object: a small class whose `__next__` raises `StopIteration` after the last item (the next lesson shows the generator shortcut).

## `class LineReader(lines)`

`lines` is a list of strings that may end with `"\n"`. A `LineReader` is a **one-shot iterator**:

- `iter(reader) is reader`.
- `next(reader)` returns the next line without its trailing `"\n"` and adds one to `reader.line_number`, which starts at `0`.
- Once the lines run out, **every** later `next(reader)` raises `StopIteration`, so a second loop over the same reader is empty.

## `is_iterator(obj)` and `is_reiterable(obj)`

Both decide with `iter(obj) is obj`, and both return `False`, without raising, when `obj` is not iterable.

| Object | `is_iterator` | `is_reiterable` |
| --- | --- | --- |
| `list`, `dict`, `str`, `range`, `Paginator` | `False` | `True` |
| a class with only `__getitem__` (the sequence protocol, no `__iter__`) | `False` | `True` |
| `iter([...])`, a generator, `map(...)`, `LineReader` | `True` | `False` |
| `42`, `None` | `False` | `False` |
