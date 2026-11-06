An order form sends quantities and settings as text. Write five helpers in `main.py` that turn bad input into clear exceptions and handle only the failures they expect.

## `parse_quantity(text)`

Return `text` as a whole number. Spaces around it are fine: `parse_quantity(" 7 ") == 7`. Raise `ValueError` when the text is not a whole number (`"12abc"`, `"1.5"`, `""`) or when the number is negative. In both cases the message contains the original text, so `"12abc"` appears in `str(error)`.

## `safe_ratio(part, whole)`

Return `part / whole`, or `None` when `whole` is zero. Any other failure, such as a text value passed by mistake, must still raise.

## `read_port(settings)`

`settings` is a dict. Return `settings["port"]` as an `int`, whether it is stored as a number or as text. When the dict has no `"port"` key, return `8080`. When the value cannot be turned into a number (`"http"`, `None`), raise `ValueError` with `port` in its message.

## `parse_all(texts)`

Parse every text of the list with `parse_quantity` and return a tuple `(values, rejected)`: `values` holds the numbers that parsed, in order, and `rejected` the original texts that raised `ValueError`. One bad text never stops the others.

## `run_with_log(action, log)`

`action` is a function that takes no arguments and `log` is a list. Append `"start"` to `log`, call `action()` and return its result. Append `"end"` to `log` afterwards in every case, even when `action` raises; that exception must still reach the caller.

Press **Run** to see the helpers handle good and bad input in `demo.py`.
