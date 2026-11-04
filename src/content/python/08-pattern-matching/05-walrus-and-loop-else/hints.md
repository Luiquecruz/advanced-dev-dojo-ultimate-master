`while chunk := read(size):` calls `read`, binds the result and tests it in the loop header. An empty `b""` or `""` is falsy, so the loop ends before the empty chunk can be appended.
---
In `for … else`, the `else` lines up with the `for`, not with the `if`. It runs only when the loop finished without `break`. Break on the first match; after the loop, `index` and `item` still hold the values from the iteration that broke.
---
A walrus inside the filter of a generator expression keeps the parsed value for the output part: `dict(pair for line in lines if (pair := parse(line)) is not None)`. Parenthesize the `:=` so the comparison applies to the parsed value.
