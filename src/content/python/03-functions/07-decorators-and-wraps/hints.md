Every wrapper needs `@functools.wraps(function)` on the line above `def wrapper`. That one line copies the name and docstring and sets `__wrapped__`, which `inspect.signature` follows.
---
A function can carry attributes. Set `wrapper.calls = 0` after defining the wrapper and do `wrapper.calls += 1` inside it; each decoration creates a new wrapper with its own counter.
---
`@first` above `@second` builds `first(second(job))`. The outer wrapper runs first, so append to `ORDER` before `return function(*args, **kwargs)`, not after it.
