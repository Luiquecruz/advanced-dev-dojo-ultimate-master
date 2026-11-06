A decorator takes exactly one argument: the function. To configure it, you write a **decorator factory**, a function that takes the settings and returns the decorator. That makes three nested levels:

```py
import functools

def tagged(label):                     # 1. factory: receives the settings
    def decorator(function):           # 2. decorator: receives the function
        @functools.wraps(function)
        def wrapper(*args, **kwargs):  # 3. wrapper: runs on every call
            print(f"[{label}]", function.__name__)
            return function(*args, **kwargs)
        return wrapper
    return decorator

@tagged("billing")          # tagged("billing") runs first and returns `decorator`
def charge(amount): ...
# charge = tagged("billing")(charge)
```

## How it works

Python does not know which form you meant: `@retry` passes the function as the first argument, `@retry(times=2)` passes the settings and applies whatever comes back. A decorator that should support both must check what it received. The usual pattern makes the function an optional positional-only first parameter and every setting keyword-only:

```py
def retry(function=None, /, *, times=3, exceptions=(Exception,)):
    def decorator(target):
        @functools.wraps(target)
        def wrapper(*args, **kwargs):
            ...
        return wrapper

    if function is None:         # used with settings: @retry(times=2)
        return decorator
    if not callable(function):   # @retry(5): a setting passed by position
        raise TypeError("retry settings are keyword-only: use @retry(times=5)")
    return decorator(function)   # used bare: @retry
```

Keyword-only settings mean the only positional argument is the function, so `function is None` tells the two forms apart. They do not stop a caller from writing `@retry(5)`: the `5` still binds to `function`, and without the `callable` check it would be wrapped as if it were the function and fail later with a confusing `'int' object is not callable`.

### State per decorated function

Anything created inside `decorator` (a counter, a `deque` of timestamps) exists once per decorated function, because `decorator` runs once per `@`. Anything created inside `wrapper` exists once per call. Module-level state is shared by every function the factory ever decorated, which is almost never what you want.

### Inject time

A rate limiter or a cache with expiry depends on the clock. Taking `clock` as a parameter (defaulting to `time.monotonic` in production) makes the behavior testable without sleeping: the test moves a fake clock forward.

Pitfalls:

- `except exceptions:` accepts a tuple of exception classes; a list does not work.
- Retrying everything (`Exception`) also retries programming errors such as `TypeError`; list the transient errors instead.
- A class with `__init__(self, settings)` and `__call__(self, function)` is a valid decorator factory too, useful when the decorator exposes methods such as `reset()`.

## Common mistakes

**Writing only a factory and then using it bare.** `@retry` calls the factory with the function as its first setting, and the decorated name becomes the inner `decorator`:

```py
# wrong: @retry gives times=fetch, and fetch() raises
# TypeError: decorator() missing 1 required positional argument
def retry(times=3):
    def decorator(function): ...
    return decorator

# right: the function is an optional positional-only first parameter
def retry(function=None, /, *, times=3):
    def decorator(target): ...
    return decorator if function is None else decorator(function)
```

**Keeping the call times in a module-level list.** Every function the factory decorates then shares one window, so calls to `sms` use up the limit of `email`. Create the state inside `decorator`.

## When to choose it

- **A factory** when the behavior needs settings: limits, retry counts, cache sizes, permission names.
- **Bare-or-called support** for library decorators used in many places, where `@retry` with defaults is common.
- **Keyword-only settings** always, plus a `callable` check, so the two forms can never be confused.
- **An injected clock** for any time-based behavior, and **a plain decorator** when there is nothing to configure.
