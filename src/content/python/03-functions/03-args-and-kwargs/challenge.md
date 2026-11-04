Write three call helpers in `main.py`. They wrap any function without knowing its signature.

## `forward(function, /, *args, **kwargs)`

Call `function` with exactly the positional and keyword arguments `forward` received and return a pair `(result, call_record)`, where `call_record` is `{"args": args, "kwargs": kwargs}`: `args` is the tuple of positional arguments, `kwargs` the dict of keyword arguments.

- `forward(price, 10, 3, discount=5)` calls `price(10, 3, discount=5)`.
- A keyword argument named `function` is forwarded to the callee like any other: `forward(target, function="report")` calls `target(function="report")`.

## `retry_call(function, /, *args, attempts=3, **kwargs)`

Call `function(*args, **kwargs)` up to `attempts` times.

- `attempts` belongs to `retry_call` and is **never** forwarded.
- Return the result of the first call that does not raise; do not call again after a success.
- When every attempt raises, re-raise the exception of the **last** attempt.

## `compose(*functions)`

Return a one-argument function that applies `functions` **left to right**: `compose(f, g)(x)` is `g(f(x))`. With no functions, it returns its argument unchanged (the same object).
