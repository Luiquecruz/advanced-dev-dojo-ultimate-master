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

## Coming from TypeScript and JavaScript

TypeScript decorator factories look the same (`@Retry({ times: 3 })`), and a decorator that takes no options is written without parentheses. Developers carry that over and write a Python factory, then use it bare:

```ts
function retry(options = { times: 3 }) {
  return (target: Function, context: ClassMethodDecoratorContext) => { /* ... */ };
}
```

```py
def retry(times=3):
    def decorator(function): ...
    return decorator

@retry            # retry(fetch): `times` is now the function, and fetch becomes `decorator`
def fetch(): ...

fetch()           # TypeError: decorator() missing 1 required positional argument
```

Python does not know which form you meant: `@retry` passes the function as the first argument, `@retry(times=2)` passes the settings. A decorator that should support both must check what it received.

## How it works

The usual pattern makes the function an optional positional-only first parameter and every setting keyword-only:

```py
def retry(function=None, /, *, times=3, exceptions=(Exception,)):
    def decorator(target):
        @functools.wraps(target)
        def wrapper(*args, **kwargs):
            ...
        return wrapper

    if function is not None:     # used bare: @retry
        return decorator(function)
    return decorator             # used with settings: @retry(times=2)
```

Because the settings are keyword-only, `@retry(5)` fails loudly instead of being mistaken for a function.

### State per decorated function

Anything created inside `decorator` (a counter, a `deque` of timestamps) exists once per decorated function, because `decorator` runs once per `@`. Anything created inside `wrapper` exists once per call. Module-level state is shared by every function the factory ever decorated, which is almost never what you want.

### Inject time

A rate limiter or a cache with expiry depends on the clock. Taking `clock` as a parameter (defaulting to `time.monotonic` in production) makes the behavior testable without sleeping: the test moves a fake clock forward.

Pitfalls:

- `except exceptions:` accepts a tuple of exception classes; a list does not work.
- Retrying everything (`Exception`) also retries programming errors such as `TypeError`; list the transient errors instead.
- A class with `__init__(self, settings)` and `__call__(self, function)` is a valid decorator factory too, useful when the decorator exposes methods such as `reset()`.

## When to choose it

- **A factory** when the behavior needs settings: limits, retry counts, cache sizes, permission names.
- **Bare-or-called support** for library decorators used in many places, where `@retry` with defaults is common.
- **Keyword-only settings** always, so the two forms can never be confused.
- **An injected clock** for any time-based behavior, and **a plain decorator** when there is nothing to configure.
