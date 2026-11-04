Python has three exact number types next to `float`: `int` (arbitrary precision), `decimal.Decimal` (base-10 digits with a context) and `fractions.Fraction` (a ratio of two ints).

```py
from decimal import Decimal, ROUND_HALF_UP
from fractions import Fraction

0.1 + 0.2 == 0.3                               # False: binary floats approximate 0.1
Decimal("0.1") + Decimal("0.2") == Decimal("0.3")   # True
Decimal("2.675").quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)   # Decimal('2.68')
Fraction("1/3") + Fraction("1/6")              # Fraction(1, 2)
2 ** 100                                       # 1267650600228229401496703205376, exact
divmod(1000, 3)                                # (333, 1)
```

## Coming from TypeScript and JavaScript

JavaScript has one `number` type (an IEEE 754 double) plus `BigInt`. Money code therefore leans on two habits that break in Python:

```ts
Math.round(2.5);                   // 3, and Math.round(-2.5) is -2
Math.round(price * 100) / 100;     // the usual "round to cents"
-7 % 2;                            // -1
```

```py
round(2.5), round(3.5)             # (2, 4): round() is half-to-even ("banker's rounding")
round(2.675, 2)                    # 2.67: the float stored is 2.67499999999999982236431605997495353221893310546875
-7 // 2, -7 % 2                    # (-4, 1): // floors, so % takes the sign of the divisor
```

The mistake is "round to cents" with floats: the binary value is already below or above the decimal you typed, and `round` picks the even neighbor on ties. Splitting a bill with `total / people` returns floats, and rounding each share loses or invents cents. Keep money as integer cents (`divmod`) or as `Decimal` built from **strings**, and choose the rounding mode explicitly.

## How it works

- **`Decimal(text)`** stores the digits you wrote. `Decimal(2.675)` converts the binary float exactly, so it is `2.674999…` and rounds down; never build money from floats. `quantize(Decimal("0.01"), rounding=...)` fixes the exponent and applies the mode. Arithmetic uses the current context: 28 significant digits and `ROUND_HALF_EVEN` by default. `quantize` signals `InvalidOperation` if the result needs more digits than the context precision.
- **Rounding modes**: `ROUND_HALF_UP` (ties away from zero, the rule taught in school and used by most invoices), `ROUND_HALF_EVEN` (ties to even, which avoids a bias when summing many rounded values), `ROUND_DOWN`/`ROUND_FLOOR` and others. The mode is a business decision; write it down.
- **`Fraction`** keeps ratios exact: `Fraction("0.1")` is `1/10`, while `Fraction(0.1)` is `3602879701896397/36028797018963968`, the float's true value.
- **`int`** never overflows, and `divmod(a, b)` returns `(a // b, a % b)` with floor semantics. Splitting `1000` cents three ways is `divmod(1000, 3) == (333, 1)`: everyone gets 333 and one person gets the extra cent.
- **`math.isclose`** compares floats with a relative tolerance when floats are the right tool (measurements, statistics).

## Security note

Number parsing can be a denial-of-service vector. Converting a huge decimal string to `int` takes more than linear time, so since Python 3.11 `int(text)` and `str(number)` raise `ValueError` above 4,300 digits (`sys.set_int_max_str_digits`). The limit does not cover `Decimal(text)`, which accepts a million digits and then makes every later operation on them slow; `Fraction(text)` is limited only because it parses its parts with `int`. Check the length of untrusted number text yourself before parsing it, and refuse `NaN` and `Infinity` when they are not meaningful amounts.

> **Status as of November 2026:** Python 3.14 added `Decimal.from_number()` and `Fraction.from_number()`, and `Fraction` now accepts any object with an `as_integer_ratio()` method. The integer string conversion limit has existed since Python 3.11 with a default of 4,300 digits.

## When to choose it

- **Integer cents** for money that only needs adding, splitting and comparing: fast, exact, and `divmod` distributes remainders.
- **`Decimal` from strings** with an explicit `quantize` mode for prices, taxes, interest and anything printed on an invoice.
- **`Fraction`** for exact ratios (exchange rates, recipe scaling, probabilities) where repeating decimals must not round.
- **`float`** for measurements and science, compared with `math.isclose`, never for money.
