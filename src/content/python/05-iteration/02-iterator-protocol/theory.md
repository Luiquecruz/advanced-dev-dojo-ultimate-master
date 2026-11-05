A `for` loop asks its object for an **iterator** once, then pulls items from that iterator until it signals the end. This is what `for page in pages:` runs:

```py
pages = [["order-1", "order-2"], ["order-3"]]

iterator = iter(pages)              # pages.__iter__()
while True:
    try:
        page = next(iterator)       # iterator.__next__()
    except StopIteration:           # the end is an exception, not a value
        break
    print(page)
```

Two roles take part. The **iterable** (`pages`) owns the data and hands out iterators through `__iter__`. The **iterator** owns the position: `__next__` returns the next item or raises `StopIteration`, and its own `__iter__` returns `self`, so an iterator can be used wherever an iterable is expected.

## How it works

- `iter(obj)` calls `type(obj).__iter__(obj)`. Without `__iter__` it falls back to the sequence protocol from module 02 (`__getitem__(0)`, `__getitem__(1)`... until `IndexError`); otherwise it raises `TypeError`.
- `next(iterator)` calls `__next__`. `next(iterator, default)` returns `default` instead of raising when the iterator is exhausted.
- Once `__next__` has raised `StopIteration`, it must keep raising it on every later call. The documentation calls iterators that start again "broken".
- **Split the roles** for anything that can be read twice: the container keeps the data and creates a new cursor object in `__iter__`. Every loop then gets its own position, nested loops work and the container can be shared.
- **Merge the roles** for data that can only be read once (a stream, a socket, a file): `__iter__` returns `self`, and the object documents that it is one-shot.
- `iter(obj) is obj` tells the two apart. Files, generators, `map`, `filter`, `zip` and `enumerate` objects are iterators; `list`, `dict`, `str`, `range` and dict views are re-iterable. The check is a heuristic: a class could return a "fresh" iterator that still shares state.
- `isinstance(obj, collections.abc.Iterator)` checks structurally for `__iter__` and `__next__`. `isinstance(obj, Iterable)` misses classes that only define `__getitem__`; calling `iter(obj)` is the reliable test.
- `iter(callable, sentinel)` builds an iterator from a function: `iter(stream.readline, "")` calls `readline` until it returns `""`.

The next lesson shows the shortest way to return a fresh iterator: write `__iter__` as a generator.

## Common mistakes

**A container whose `__iter__` returns `self`.** The loop position then lives on the container, so a second loop finds it exhausted and two nested loops share one position. Keep the data on the container and hand out a new cursor:

```py
# wrong: the paginator is its own cursor
class Paginator:
    def __iter__(self):
        return self              # the second loop sees nothing

# right: every loop gets a fresh cursor
class Paginator:
    def __iter__(self):
        return PageCursor(self.pages)
```

**Ending with a value instead of an exception.** A `__next__` that returns `None` when nothing is left hands out `None` forever, and a `for` loop over it never stops. Only `raise StopIteration` ends the loop.

## When to choose it

- **An iterable** (`__iter__` returning a new iterator) for containers and views over data that can be read again: fetched pages, a configuration, a tree.
- **An iterator** (`__next__`, and `__iter__` returning `self`) for one-shot sources: a stream, a socket, a queue of events. Say so in the docstring.
- **A generator in `__iter__`** instead of a hand-written cursor class, unless the cursor exposes state that callers read, such as `line_number`.
- Never store the loop position on a container.
