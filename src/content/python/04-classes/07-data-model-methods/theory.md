Built-in syntax calls **special methods** on your objects: `repr(x)` calls `x.__repr__()`, `a == b` calls `a.__eq__(b)`, `a + b` calls `a.__add__(b)`, `if x:` calls `x.__bool__()`. Implement the right ones and your class works with `sorted`, `set`, `sum`, f-strings and the debugger.

```py
from functools import total_ordering

@total_ordering
class Version:
    def __init__(self, major, minor):
        self.major, self.minor = major, minor

    def __repr__(self):
        return f"Version({self.major!r}, {self.minor!r})"

    def __eq__(self, other):
        if not isinstance(other, Version):
            return NotImplemented
        return (self.major, self.minor) == (other.major, other.minor)

    def __hash__(self):
        return hash((self.major, self.minor))

    def __lt__(self, other):
        if not isinstance(other, Version):
            return NotImplemented
        return (self.major, self.minor) < (other.major, other.minor)
```

`total_ordering` derives `<=`, `>` and `>=` from `__eq__` and `__lt__`.

## How it works

Sets and dict keys use `__hash__` and `__eq__` together: **equal objects must have equal hashes**. Python finds the bucket with the hash, then confirms the match with `==`.

**`NotImplemented`** is a return value, not an exception. It tells Python "I do not know this operand, ask the other side". For `a + b`, Python calls `a.__add__(b)`; on `NotImplemented` it tries `b.__radd__(a)`; if both decline, it raises `TypeError` with a clear message. Raising `TypeError` yourself in `__add__` for unknown types would stop the other operand from ever handling the operation.

- `__eq__` returning `NotImplemented` for another type makes `money == 100` fall back to identity and return `False`.
- `sum(items)` starts from `0`, so it computes `0 + first`: `int.__add__` declines, then `first.__radd__(0)` runs. Treat `0` as the identity in `__radd__`, or call `sum(items, start=Money.zero("EUR"))`.
- A rule violation between two values of your type (different currencies) is a real error: raise `TypeError` or `ValueError` with the reason.

**Text**: `__repr__` is for developers and should look like the constructor call (`Money(1050, 'EUR')`); `__str__` is for users; `__format__(spec)` receives what follows the colon in `f"{x:.2f}"`, so a class can apply the spec to the right part of its value.

**Truthiness**: `__bool__` decides `if x:`. Without it Python uses `__len__`, then treats every object as true.

## Common mistakes

**Defining `__eq__` without a matching `__hash__`.** A class that defines `__eq__` alone gets `__hash__ = None`, so its objects can no longer go into a set or be dict keys:

```py
# wrong: {Money(100, "EUR")} raises TypeError (unhashable type: 'Money')
def __eq__(self, other):
    if not isinstance(other, Money):
        return NotImplemented
    return (self.cents, self.currency) == (other.cents, other.currency)

# right: hash exactly the fields that equality compares
def __hash__(self):
    return hash((self.cents, self.currency))
```

**Comparing only the amount.** `self.cents == other.cents` makes 100 EUR equal to 100 USD. Compare every field that defines the value, and hash the same fields.

## When to choose it

- **Value objects** (money, versions, coordinates): `__repr__`, `__eq__` with a matching `__hash__`, ordering only when the order means something, and arithmetic that returns `NotImplemented` for foreign types.
- **`@dataclass(frozen=True, order=True)`** generates `__eq__`, `__hash__` and ordering when field-by-field comparison is the rule; write the methods by hand when the rule is different (currency checks, normalization).
- Avoid operator overloading that surprises readers: `+` should mean addition, and `__bool__` should mean "empty" or "zero".
