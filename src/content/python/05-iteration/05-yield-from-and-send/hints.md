For `flatten`, decide what a leaf is before deciding what to descend into: `isinstance(item, (str, bytes))` comes first, then "not an `Iterable`" (from `collections.abc`). Everything else goes to `yield from flatten(item)`. Without the string check, `"a"` contains `"a"` and the recursion never ends.
---
`running_average` keeps `total` and `count` as locals. The line `value = yield average` both hands out the current mean and receives the next value; update the total and count after it. The first `next()` reaches that line before any value exists, which is why it yields `None`.
---
`collect` cannot use `list()` or `for`: both swallow `StopIteration`. Loop with `next(generator)` inside `try`, and in `except StopIteration as stop:` return the items with `stop.value`. For `tracked`, wrap the `yield from iterable` in `try`/`finally` and log in the `finally`.
