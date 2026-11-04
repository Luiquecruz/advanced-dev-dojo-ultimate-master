An event system builds its callbacks in loops, and every callback ends up using the last value. Fix the builders and write a run-once wrapper in `main.py`.

## `make_handlers(names)`

Return a list with one callable per name, in order. Calling the handler for `"ada"` with no arguments returns `"hello ada"`.

## `make_multipliers(factors)`

Return a list with one callable per factor. Each takes a number and returns it multiplied by **its own** factor. `factors` can be any iterable, including a generator.

## `once(function)`

Return a wrapper that calls `function(*args, **kwargs)` on the **first** call and returns that result on every later call, ignoring the arguments of later calls.

- Keep the state in the closure (`nonlocal`), not in module-level variables, so two wrappers are independent.
- A result of `None` is a valid result and is cached too.
- If the first call raises, nothing is cached: the exception propagates and the next call runs `function` again.
