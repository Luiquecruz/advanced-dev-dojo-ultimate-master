`share, extra = divmod(total_cents, people)` gives the base share and how many people get one more cent. Build the list with `share + 1` for the first `extra` positions. Check `isinstance(total_cents, int)` first so a float total raises `TypeError`.
---
`Decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)` rounds to cents. Refuse floats before building the `Decimal`, check `len(value)` for strings before parsing, and turn `decimal.InvalidOperation` (raised by `Decimal("abc")`) into `ValueError`. `Decimal("NaN")` parses, so test `is_finite()`.
---
`Fraction(text)` parses `"3/4"` and `"0.1"` exactly; `Fraction(float(text))` does not. Check the length first and convert the `ZeroDivisionError` of `"1/0"` into `ValueError` with `raise ... from None`.
