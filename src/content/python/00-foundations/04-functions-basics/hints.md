A default lives in the `def` line: `def apply_discount(price_cents, percent=10):`. The body is one `return` with the formula from the challenge; `price_cents * percent // 100` is the discount rounded down to whole cents, so the price you return is rounded up: 999 cents become 900, not 899.
---
`stats` first checks for an empty list (`len(numbers) == 0`) and returns `None, None, None`. Otherwise it returns `min(numbers)`, the mean `sum(numbers) / len(numbers)` and `max(numbers)`, separated by commas. Every path must end in `return`: a `print` gives the caller `None`.
---
In `bounds`, return `"no numbers"` early for an empty list. Otherwise unpack the three values into three names (`lowest, _, highest = stats(numbers)`) and build the text with an f-string.
