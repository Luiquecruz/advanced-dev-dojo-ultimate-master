Count the levels: `rate_limit(...)` returns `decorator`, `decorator(function)` returns `wrapper`. Create the window (a list or `collections.deque` of times) inside `decorator`, so each decorated function gets its own.
---
In the wrapper: read `now = clock()`, drop the recorded times with `now - stamp >= period`, raise if `max_calls` remain, otherwise append `now` and call. With a `deque`, the oldest time is always at index 0.
---
For `retry`, give it the signature `retry(function=None, /, *, times=3, exceptions=(Exception,))`. Build `decorator` as usual, then `return decorator(function)` when `function` is not `None` (bare use) and `return decorator` otherwise.
