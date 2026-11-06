Add four more tools to the shop's toolbox. Each one treats functions as values or calls itself. The starter's annotations tell you what each function receives and returns. Complete the functions in `main.py`.

## Functions

- `sort_by_length(words)`: returns a **new** list with the words ordered from the shortest to the longest. Words of the same length keep their original order, and the list passed in is not changed. `sort_by_length(["pear", "fig", "apple"])` returns `["fig", "pear", "apple"]`.
- `make_multiplier(factor)`: returns a **function** that takes a number and returns it multiplied by `factor`. `make_multiplier(3)(5)` returns `15`, and every multiplier keeps its own factor.
- `total(*amounts, currency="EUR")`: adds any number of amounts in cents and returns the sum as text with two decimals and the currency: `total(250, 1000)` returns `"12.50 EUR"`, `total(199, currency="USD")` returns `"1.99 USD"` and `total()` returns `"0.00 EUR"`.
- `depth(value)`: returns how many levels of lists are nested in `value`, by calling itself. A value that is not a list has depth `0`; a list has depth 1 plus the largest depth of its items. `depth(5)` is `0`, `depth([])` is `1`, `depth([1, [2, [3]]])` is `3`.

## Rules

- Keep the function names, parameters and annotations.
- Use `isinstance(value, list)` to tell lists from other values.
