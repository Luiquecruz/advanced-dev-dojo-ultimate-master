A checkout service splits bills between friends, shows totals in cents and stores exchange-rate ratios exactly. Amounts arrive from forms and partner APIs as text. Write three functions in `main.py`; the constant `MAX_TEXT_LENGTH = 64` is already there.

## `split_bill(total_cents, people)`

Return a list of `people` integers that sum **exactly** to `total_cents`. Shares differ by at most one cent, and the extra cents go to the first people: `split_bill(1000, 3) == [334, 333, 333]`.

- `TypeError` when `total_cents` is not an `int` (money never travels as `float`);
- `ValueError` when `total_cents` is negative or `people` is less than `1`.

## `round_money(value)`

Return a `decimal.Decimal` rounded to cents with `ROUND_HALF_UP`: `round_money("2.675") == Decimal("2.68")`, `round_money(Decimal("2.665")) == Decimal("2.67")`, and `str(round_money(3)) == "3.00"`.

- `value` may be a `str`, an `int` or a `Decimal`. A `float` raises `TypeError`: its digits are already lost.
- Text longer than `MAX_TEXT_LENGTH` characters raises `ValueError` **before** parsing, and so does text that is not a finite number (`"abc"`, `"NaN"`, `"Infinity"`).

## `exact_ratio(text)`

Return the `fractions.Fraction` written in `text`, such as `"3/4"`, `"-2"` or `"0.1"` (which must be exactly `1/10`). Raise `ValueError` when the text is longer than `MAX_TEXT_LENGTH` characters, is not a number, or has a zero denominator.
