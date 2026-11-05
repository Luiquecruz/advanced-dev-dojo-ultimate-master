`shipping_cost` is one `if` with two `elif` branches and an `else`. Python runs only the first true branch, so start with the cheapest condition, `total_cents < 2000`, and move up.
---
For `fizzbuzz`, loop over `range(1, n + 1)` and append one text per number. Test "multiple of both 3 and 5" before the single cases: `number % 15 == 0`. `str(number)` turns a number into text.
---
`first_index` can use `for index, item in enumerate(items)` and `return index` as soon as the item matches; after the loop, `return None`. `running_max` keeps a variable with the largest value so far, and `pair_up` loops over `zip(names, scores)`.
