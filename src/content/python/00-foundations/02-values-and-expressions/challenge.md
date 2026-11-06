A small shop needs the arithmetic behind its receipts. Prices are whole **cents** (`1250` is 12.50 EUR). Complete the five functions in `main.py`.

## Functions

- `line_total(price_cents, quantity)`: returns the price of one line, `price_cents` times `quantity`, as an `int`.
- `split_evenly(total_cents, people)`: returns two whole numbers, `share, remainder`: how many cents each person pays and how many cents are left over. `split_evenly(1000, 3)` returns `(333, 1)`.
- `format_cents(cents)`: returns the amount as text with exactly two decimals and the currency: `format_cents(1250)` returns `"12.50 EUR"`, `format_cents(7)` returns `"0.07 EUR"`.
- `kind_of(value)`: returns the name of the value's type as text: `"int"` for `3`, `"float"` for `2.5`, `"str"` for `"3"`.
- `print_receipt(item, price_cents, quantity)`: **prints** two lines and returns nothing. For `print_receipt("mug", 1250, 3)` the lines are `3 x mug` and `total 37.50 EUR`. Use `line_total` and `format_cents`.

## Rules

- Keep the function names and parameters.
- No imports are needed.

Press **Run** to see the demo use your functions, then run the tests.
