Write two configurable decorators for an API client in `main.py`. Both preserve the decorated function's metadata with `functools.wraps`. Never read real time: the tests move a fake clock.

## `RateLimitError`

An `Exception` subclass, already defined.

## `rate_limit(max_calls, period, clock)`

A decorator factory. `clock` is a function returning the current time in seconds.

- Each call reads `clock()`. A call counts against the limit while `now - call_time < period`.
- When `max_calls` accepted calls are already inside the window, raise `RateLimitError` **without** calling the function. Rejected calls are not recorded.
- Otherwise record the call time, call the function and return its result.
- Every decorated function has its **own** window.

## `retry(function=None, /, *, times=3, exceptions=(Exception,))`

Usable in both forms:

```py
@retry
def fetch(): ...

@retry(times=2, exceptions=(ConnectionError,))
def upload(): ...
```

- `times` is the **total** number of attempts.
- Only exceptions that are instances of `exceptions` are retried; any other exception propagates immediately.
- When every attempt fails, re-raise the exception of the last attempt.
- Arguments are forwarded unchanged and the first successful result is returned.
