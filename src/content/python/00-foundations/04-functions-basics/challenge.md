Build the first three tools of a small toolbox for a shop. Amounts are whole **cents**. Complete the functions in `main.py`.

## Functions

- `apply_discount(price_cents, percent=10)`: returns the price after taking off `percent` per cent, rounded **down** to whole cents: `price_cents - price_cents * percent // 100`. When the caller leaves `percent` out, the discount is 10 per cent: `apply_discount(2000)` returns `1800`, and `apply_discount(2000, percent=25)` returns `1500`.
- `stats(numbers)`: **returns** three values, `lowest, mean, highest`, where `mean` is the sum divided by the count (a `float`). `stats([2, 4, 9])` returns `(2, 5.0, 9)`. For an empty list it returns `(None, None, None)`.
- `bounds(numbers)`: calls `stats`, unpacks its result and returns the text `"<lowest> to <highest>"`, such as `"2 to 9"`. For an empty list it returns `"no numbers"`.

## Rules

- Keep the function names and parameters, and keep `percent=10` as a default.
- `stats` and `bounds` return their results; they do not print them.
- No imports are needed.
