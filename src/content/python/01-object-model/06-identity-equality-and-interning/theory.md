Python has two comparisons that answer different questions:

- `a == b` asks **"are they equal?"** It calls `a.__eq__(b)`, so each class decides what equal means.
- `a is b` asks **"are they the same object?"** It compares identity and cannot be customized.

```py
first = [1, 2]
second = [1, 2]
print(first == second)   # True: same contents
print(first is second)   # False: two different list objects
```

## Use `is` for singletons, `==` for values

`None`, `True`, `False` and your own sentinels are singletons, so `is` is the right check and cannot be fooled by an unusual `__eq__`.

```py
if value is None:
    ...

MISSING = object()          # a sentinel nobody else can pass by accident

def lookup(mapping, key, default=MISSING):
    if key in mapping:
        return mapping[key]
    if default is MISSING:
        raise KeyError(key)
    return default          # `None` is a legitimate default
```

Never compare numbers or strings with `is`. CPython caches small integers and may reuse equal string objects, so `a is b` can be `True` for `100` and `False` for `1000`. That is an **implementation detail**, not a guarantee, and the compiler warns when you write `is` against a literal.

## Coming from TypeScript and JavaScript

- JS `===` compares primitives by value and objects by reference. Python splits that into `==` (value, customizable) and `is` (identity).
- JS `==` coerces (`1 == "1"` is `true`). Python's `==` does not coerce across unrelated types: `1 == "1"` is `False`.
- JS has `null` and `undefined`; Python has one `None`. Test it with `is None`.

## Defining equality

A class that defines `__eq__` must keep two rules: equal objects have equal hashes, and `__eq__` should return `NotImplemented` for types it does not understand so Python can try the other operand.

```py
class Money:
    def __init__(self, amount, currency):
        self.amount = amount
        self.currency = currency

    def __eq__(self, other):
        if not isinstance(other, Money):
            return NotImplemented
        return (self.amount, self.currency) == (other.amount, other.currency)

    def __hash__(self):
        return hash((self.amount, self.currency))
```

If you define `__eq__` without `__hash__`, Python sets `__hash__` to `None` and instances become unhashable. Hash only fields that do not change.

`float("nan") == float("nan")` is `False`: equality is not always reflexive.

## When to choose it

- **`is`**: `None`, `True`, `False`, sentinels, "is this the very same object".
- **`==`**: every other comparison of values.
- **A sentinel (`object()`)** when `None` is a valid argument; **`None`** when absence is the only meaning.
- **`@dataclass`** (module 04) when you want equality and hashing generated from fields.
