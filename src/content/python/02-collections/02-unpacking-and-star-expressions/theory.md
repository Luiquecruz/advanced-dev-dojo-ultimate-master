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

## `*` and `**` at call sites and in displays

```py
def connect(host, port, *, ssl=True): ...

args = ["db", 5432]
options = {"ssl": False}
connect(*args, **options)

merged = {**defaults, **user, "debug": True}   # later keys win
combined = [*first_list, *second_list]          # new list
unique = {*first_list, *second_list}            # new set
```

`{**a, **b}` and `[*a, *b]` build **new** containers; neither input changes.

## Coming from TypeScript and JavaScript

```ts
const [first, ...rest] = items;            // rest is an array
const merged = { ...defaults, ...user };   // later wins
connect(...args);
```

- JavaScript's `...rest` can only be last. Python's `*middle` can be **in the middle**.
- JavaScript destructures objects by property name (`{ a, b } = obj`). Python unpacks by **position**; for dicts you unpack keys or items explicitly.
- `**` is only for mappings, `*` for any iterable. They are not interchangeable.

## Pitfalls

```py
first, *rest = []        # ValueError: not enough values to unpack
a, b = [1, 2, 3]        # ValueError: too many values to unpack
```

Unpacking an iterator consumes it. A generator cannot be unpacked twice.

## When to choose it

- **Unpacking** instead of indexing when positions have meaning (`name, price = row`).
- **Star targets** for "first and rest" or "ends and middle" without slicing.
- **`{**a, **b}`** for layered configuration where inputs must stay untouched; use `dict.update` only when mutation is intended.
- Avoid unpacking very long sequences into names, and avoid cleverness that hides the shape of the data.
