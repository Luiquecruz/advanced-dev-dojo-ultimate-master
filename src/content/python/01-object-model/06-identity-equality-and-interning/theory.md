Python has two comparisons that answer different questions:

- `a == b` asks **"are they equal?"** It calls `a.__eq__(b)`, so each class decides what equal means.
- `a is b` asks **"are they the same object?"** It compares identity and cannot be customized.

```py
first = [1, 2]
second = [1, 2]
print(first == second)   # True: same contents
print(first is second)   # False: two different list objects
```

## How it works

`None`, `True`, `False` and your own sentinels are **singletons**: only one object of each exists. `is` is the right check for them and cannot be fooled by an unusual `__eq__`.

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

`==` never converts between unrelated types: `1 == "1"` is `False`. Numbers of different types still compare by value (`1 == 1.0` is `True`).

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

## Common mistakes

**Comparing numbers or strings with `is`.** CPython keeps one shared object for each small integer (-5 to 256) and may reuse equal string objects, a behavior called **interning**. So `a is b` can be `True` for `100` and `False` for `1000` computed at run time, and the code passes every small test and fails in production. That is an implementation detail, not a guarantee, and the compiler warns when you write `is` against a literal.

```py
if first.amount is second.amount:   # wrong: identity, true only by luck
    ...
if first.amount == second.amount:   # right: equal values
    ...
```

**Testing absence with `== None`.** A class with a custom `__eq__` can claim to equal `None`. Write `value is None`.

## When to choose it

- **`is`**: `None`, `True`, `False`, sentinels, "is this the very same object".
- **`==`**: every other comparison of values.
- **A sentinel (`object()`)** when `None` is a valid argument; **`None`** when absence is the only meaning.
- **`@dataclass`** (module 04) when you want equality and hashing generated from fields.
