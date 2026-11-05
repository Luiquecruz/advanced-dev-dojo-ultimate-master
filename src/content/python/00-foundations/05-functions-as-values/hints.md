`sorted(words, key=len)` returns a new list and sorts by each word's length. Pass `len` without parentheses: `sorted` calls it for you, once per word. `sorted` keeps equal items in their original order.
---
In `make_multiplier`, the inner function `multiply` can use `factor` directly: return `number * factor`. The outer function already returns `multiply` itself, without calling it. For `total`, `amounts` is a tuple, so `sum(amounts)` works even when it is empty.
---
`depth` has a base case: when `isinstance(value, list)` is false, return `0`. Otherwise loop over the items, call `depth(item)` on each, keep the largest result, and return 1 plus it.
