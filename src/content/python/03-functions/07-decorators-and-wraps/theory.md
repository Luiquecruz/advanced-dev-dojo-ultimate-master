A **decorator** is a callable that takes a function and returns a replacement. The `@` line is shorthand for one assignment:

```py
import functools

def logged(function):
    @functools.wraps(function)
    def wrapper(*args, **kwargs):
        print("calling", function.__name__)
        return function(*args, **kwargs)
    return wrapper

@logged
def ship(order_id):
    """Ship one order."""
    return f"shipped {order_id}"

# exactly the same as: ship = logged(ship)
```

The decorator runs **once**, when `def` executes (usually at import). The wrapper runs on **every call**.

## How it works

After decoration, the name `ship` refers to the wrapper, not to the function you wrote. That matters because in Python the function object is the surface tools read: logging, tracebacks, `help()`, documentation generators, pytest and FastAPI look at `__name__`, `__doc__` and the signature.

`functools.wraps(function)` is itself a decorator for the wrapper. It copies `__module__`, `__name__`, `__qualname__`, `__doc__`, the annotations and type parameters, merges `__dict__`, and sets `wrapper.__wrapped__ = function`. `inspect.signature` follows `__wrapped__`, so the wrapper reports the original parameters.

### Stacking

```py
@first
@second
def job(): ...

# job = first(second(job))
```

Decorators **apply bottom-up**: `second` wraps `job`, then `first` wraps the result. At call time the outermost wrapper runs first, so code before `return function(...)` runs **top-down** (`first`, then `second`), and code after it runs in reverse.

### State on the wrapper

A function is an object, so a decorator can attach attributes to the wrapper (`wrapper.calls = 0`) and update them inside it. Each decoration creates a new wrapper, so counters never mix between functions.

Pitfalls:

- Doing work in the decorator body instead of in the wrapper runs it once at import, not per call.
- Validating `args[0]` assumes the value was passed by position; decide and document what happens when it is not.

> **Status as of November 2026:** since Python 3.9 (PEP 614), any expression can follow `@`, for example `@handlers["get"]` or `@config.retry_policy`.

## Common mistakes

**Returning a bare wrapper without `functools.wraps`.** The decorated name now points at `wrapper`, so its name, docstring and parameters disappear from every tool that reads them:

```py
# wrong: ship.__name__ == "wrapper", signature (*args, **kwargs)
def logged(function):
    def wrapper(*args, **kwargs):
        return function(*args, **kwargs)
    return wrapper

# right: ship keeps its name, docstring and signature
def logged(function):
    @functools.wraps(function)
    def wrapper(*args, **kwargs):
        return function(*args, **kwargs)
    return wrapper
```

**Calling the function without `return`.** A wrapper that ends with `function(*args, **kwargs)` makes every decorated function return `None`.

## When to choose it

- **A decorator** for behavior that wraps calls uniformly: logging, counting, validation, timing, caching, access checks.
- **Always `functools.wraps`** in a function-based decorator; skipping it breaks tracebacks, introspection and frameworks that read signatures.
- **A plain function call** inside the body when only one function needs the behavior: a decorator used once is indirection.
- **Explicit composition** (`build_client(...)`) when the order of several wrappers matters and must be visible in one place; module 03 ends with exactly that.
