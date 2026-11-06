`int(" 7 ")` is `7`, and `int("12abc")` already raises `ValueError`. Catch it with `except ValueError:` and raise your own `ValueError(f"not a whole quantity: {text!r}")`, which carries the text. Check for a negative number after the conversion and raise there too.
---
In `safe_ratio`, catch only `ZeroDivisionError`. A text value makes the division raise `TypeError`, which should travel to the caller untouched. An `if whole == 0:` check before dividing works as well.
---
`read_port` meets two different failures: a missing key (`KeyError`, handled with the default) and a bad value. `int("http")` raises `ValueError` and `int(None)` raises `TypeError`; `except (ValueError, TypeError):` handles both in one clause.
---
For `run_with_log`, put `return action()` inside `try:` and `log.append("end")` inside `finally:`. `finally` runs after the return value is computed and also when `action` raises, and without an `except` clause the exception keeps going.
