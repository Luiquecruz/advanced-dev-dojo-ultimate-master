Each function body is one or two lines. `line_total` is a single multiplication. For `split_evenly`, remember that `/` always gives a `float`: which operator gives the whole part, and which one gives the remainder?
---
`format_cents` needs the amount in euros (`cents / 100`) inside an f-string with the format `:.2f`, followed by ` EUR`. For `kind_of`, `type(value)` gives the type and `.__name__` gives its name as text.
---
`print_receipt` must call `print` twice and must not `return` the text. Compute the total with `line_total`, then print `f"{quantity} x {item}"` and a second line that uses `format_cents`.
