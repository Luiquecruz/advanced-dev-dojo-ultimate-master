Write the stack and error helpers of a small diagnostics module in `main.py`. An audit logger uses them to record who asked for an action, and an error reporter uses them to group failures by where they were raised and by their chain of causes. Read names and links from frames and tracebacks; never parse formatted text.

## `caller_name(skip=0)`

Return the name (`co_name`) of the function that called the function calling `caller_name`. In

```py
def audit():
    return caller_name()

def checkout():
    return audit()
```

`checkout()` returns `"checkout"`. Each unit of `skip` moves one call further out: with `skip=1`, `audit` would get the name of whoever called `checkout`.

- Methods report their function name (`"total"` for `Cart.total`) and lambdas report `"<lambda>"`.
- Raise `ValueError` when `skip` is negative or when the stack is not deep enough.
- Do not keep a frame reference after returning: `del` it in a `finally`.

## `call_path(limit)`

Return the function names of the `limit` most recent calls that led to `call_path`, **outermost first**, so the last name is the function that called `call_path`. `call_path` itself is not in the list. If `inner` (called by `middle`, called by `outer`) calls `call_path(3)`, the result is `["outer", "middle", "inner"]`. `limit` is a positive integer.

## `raised_in(error)`

Return the name of the function where `error` was raised: the innermost entry of its traceback, not the frame that caught it. A bare `raise` in a handler keeps the original entries, so the answer stays the function that raised first. Return `None` for an exception that was never raised (it has no traceback).

## `exception_chain(error)`

Return the type names of the exceptions a printed traceback of `error` shows, **root cause first and `error` last**.

- From each exception, follow `__cause__` when it is set; otherwise follow `__context__`, unless `__suppress_context__` is true (`raise ... from None`), which ends the chain.
- Each name is the type as a traceback prints it, `traceback.TracebackException`'s `exc_type_str`: bare for builtins (`"KeyError"`), module-qualified otherwise (`"tests.ConfigError"` for a class defined at the top of the tests).
- A chain that loops back on itself (two exceptions whose `__cause__` point at each other) ends at the first repeated exception instead of running forever.
