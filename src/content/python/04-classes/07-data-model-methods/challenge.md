Complete the value object `Money(cents, currency)` in `main.py`. The constructor and `Money.zero(currency)` are written; currency codes are stored in upper case.

## Text

- `repr(Money(1050, "EUR"))` is exactly `Money(1050, 'EUR')`.
- `format(m, ".2f")` and `f"{m:.1f}"` apply the spec to the amount in currency units and append the code: `10.50 EUR`, `10.5 EUR`.
- `str(m)` is `10.50 EUR`.

## Equality and hashing

- Two `Money` are equal when cents **and** currency are equal; 100 EUR is not 100 USD.
- Equal values have equal hashes, so a `set` of `Money` keeps one of each value.
- Comparing with a non-`Money` (`m == 100`) is `False`: return `NotImplemented` from `__eq__`.

## Ordering

- Amounts in one currency support `<`, `<=`, `>`, `>=`, `sorted` and `max` (`functools.total_ordering` is imported).
- Ordering two different currencies raises `TypeError`.

## Arithmetic and truthiness

- `Money + Money` in the same currency returns a new `Money`; different currencies raise `TypeError`.
- `__add__` returns `NotImplemented` for anything that is not `Money`, so `Money + 1` and `1.5 + Money` raise `TypeError`.
- `sum(items, start=Money.zero("EUR"))` works, and so does `sum(items)`: `__radd__` treats the integer `0` as the starting point.
- `Money.zero(...)` is falsy; any other amount is truthy.
