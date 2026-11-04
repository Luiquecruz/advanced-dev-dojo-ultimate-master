Build the callable pieces of a reporting module in `main.py`. `RATES` and `LOOKUPS` are given.

## `Pipeline(*steps)`

- Instances are **callable**: `pipeline(value)` passes `value` through every step in order and returns the result. With no steps it returns `value` unchanged.
- `then(step)` returns a **new** `Pipeline` with `step` appended. The original pipeline never changes, so `base.then(a)` and `base.then(b)` are independent.

## `render(value)`

A `functools.singledispatch` function:

- fallback: `f"<{type(value).__name__}>"`, so `render("x") == "<str>"`;
- `int`: `f"#{value}"`. Do not register `bool`: it reaches the `int` handler, so `render(True) == "#True"`;
- `list`: render each item with `render` and join them as `"[" + ", ".join(...) + "]"`: `render([1, "x"]) == "[#1, <str>]"`.

## `exchange_rate(currency)`

Appends `currency` to `LOOKUPS` (the expensive lookup) and returns `RATES[currency]`. Decorate it with `functools.lru_cache(maxsize=2)` so repeated currencies skip the lookup and at most two are cached.

## `Report(amounts)`

`total` is a `functools.cached_property`: the sum of `amounts`, computed **once per instance**. Each computation increments `self.computations`.
