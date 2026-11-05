**Unpacking** assigns the items of any iterable to several names at once. A starred name collects the rest.

```py
x, y = (3, 4)                      # tuple
first, second = "ab"               # any iterable
head, *tail = [1, 2, 3, 4]         # head=1, tail=[2, 3, 4]
first, *middle, last = range(5)    # first=0, middle=[1, 2, 3], last=4
(a, b), (c, d) = (1, 2), (3, 4)    # nested
a, b = b, a                        # swap without a temporary
```

The starred target is **always a `list`**, even when the source is a tuple, a string or a generator. It may be empty. Only one starred target is allowed per assignment, and too few values raise `ValueError`.

## How it works

Unpacking works by **position**: Python walks the iterable on the right and assigns its items to the names on the left, in order. The plain names take exactly one item each; the single starred name takes whatever is left, which may be nothing. The starred target may sit first, last or **in the middle**. A dict unpacks to its keys; to get keys and values, unpack its items: `for key, value in prices.items()`.

The same `*` and `**` work at call sites and inside list, set and dict displays:

```py
def connect(host, port, *, ssl=True): ...

args = ["db", 5432]
options = {"ssl": False}
connect(*args, **options)        # connect("db", 5432, ssl=False)

merged = {**defaults, **user, "debug": True}   # later keys win
combined = [*first_list, *second_list]          # new list
unique = {*first_list, *second_list}            # new set
```

`*` spreads any iterable as positional items; `**` spreads only a mapping, as keyword arguments or dict entries. They are not interchangeable. `{**a, **b}` and `[*a, *b]` build **new** containers; neither input changes.

Unpacking an iterator consumes it: a generator can be unpacked once, and a second unpacking finds it empty.

## Common mistakes

**Merging into the first input.** Starting from one of the inputs makes the result an alias of it, so `update` changes the caller's dict:

```py
def merge_layers(*layers):
    merged = layers[0]            # wrong: merged IS the caller's first dict
    for layer in layers[1:]:
        merged.update(layer)      # mutates it
    return merged

def merge_layers(*layers):
    merged = {}                   # right: a new dict
    for layer in layers:
        merged.update(layer)
    return merged
```

**Unpacking the wrong number of values.** Plain names need exactly one value each:

```py
first, *rest = []        # ValueError: not enough values to unpack
a, b = [1, 2, 3]        # ValueError: too many values to unpack
```

## When to choose it

- **Unpacking** instead of indexing when positions have meaning (`name, price = row`).
- **Star targets** for "first and rest" or "ends and middle" without slicing.
- **`{**a, **b}`** for layered configuration where inputs must stay untouched; use `dict.update` only when mutation is intended.
- Avoid unpacking very long sequences into names, and avoid cleverness that hides the shape of the data.
