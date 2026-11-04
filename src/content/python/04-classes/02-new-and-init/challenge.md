Repair two classes in `main.py` so that object creation happens in the right hook.

## `class Currency`

`Currency(code)` returns **one interned instance per code**. Codes are normalized to upper case.

- `Currency("EUR") is Currency("EUR")` and `Currency("eur") is Currency("EUR")`, whichever spelling is used first: `Currency("usd").code` is `"USD"`.
- Each instance has `code` (the upper-case code), `rates` (a dict, initially empty, that callers fill) and `init_calls`.
- `init_calls` counts how many times `__init__` ran on that object: after two `Currency("EUR")` calls it is `2`.
- Calling `Currency("EUR")` again **never resets** the state of the cached instance: rates added earlier are still there.

Keep the cache on the class (for example a class attribute `_instances`) and choose the object in `__new__`.

## `class Percent(float)`

`Percent(value)` is a `float` between 0 and 100 inclusive.

- `value` is a number or a string such as `"12.5%"` (a trailing `%` is stripped before conversion).
- Values outside 0–100 raise `ValueError` whose message contains `100`.
- `isinstance(Percent(5), float)` is true, and arithmetic returns a plain `float`: `type(Percent(5) + 1) is float`.

Use `__new__`, because a `float`'s value is fixed when the object is created.
