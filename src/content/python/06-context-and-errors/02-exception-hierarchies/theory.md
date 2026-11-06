Every exception is an instance of a class under `BaseException`, and `except` matches by class **with inheritance**: `except LookupError` catches `KeyError` and `IndexError`. An application gives its own errors one base class, so callers can catch "anything this library raises on purpose" in one clause and the specific cases where they matter.

```py
class AppError(Exception):
    status = 500

class NotFoundError(AppError, LookupError):
    status = 404

def find(orders, order_id):
    try:
        return orders[order_id]
    except KeyError:
        raise NotFoundError(f"order {order_id} not found")

try:
    order = find({}, 7)
except NotFoundError as error:     # most specific first
    print(error.status, error)     # 404 order 7 not found
except AppError:
    print("another domain error")
else:
    print("found", order)          # only when nothing was raised
finally:
    print("request done")          # in every case
```

## How it works

- **Only exceptions can be raised**: `raise` takes an instance (or a class) under `BaseException`, so `raise "card declined"` is `TypeError: exceptions must derive from BaseException`. Errors are typed objects, and the hierarchy is part of your API.
- **Order of clauses**: the first matching `except` wins. A specific clause after a general one is dead code, and Python does not warn about it.
- **Built-in families**: `LookupError` (`KeyError`, `IndexError`), `ArithmeticError` (`ZeroDivisionError`), `OSError` (`FileNotFoundError`, `PermissionError`, `ConnectionError`, `TimeoutError`), `ValueError` (`UnicodeDecodeError`, `json.JSONDecodeError`).
- **Multiple inheritance for compatibility**: `class ValidationError(AppError, ValueError)` is still caught by older code that wraps `int(text)` in `except ValueError`, and `NotFoundError(AppError, LookupError)` by code that expects a lookup failure. The standard library does the same (`json.JSONDecodeError` is a `ValueError`).
- **`BaseException` vs `Exception`**: `KeyboardInterrupt`, `SystemExit`, `GeneratorExit` and `asyncio.CancelledError` derive from `BaseException` directly so that `except Exception` leaves them alone. Domain errors always derive from `Exception`.
- **`else` keeps `try` narrow**: put only the line that may raise the expected error in `try`, and the code that depends on its success in `else`, so an unrelated error in that code is not caught by mistake.

> **Status as of November 2026:** since Python 3.14 (PEP 758) the parentheses are optional when an `except` lists several types without `as`: `except TimeoutError, ConnectionError:`. With `as`, or on 3.13 and older, write `except (TimeoutError, ConnectionError) as error:`.

### Security note

A message that reaches a user is part of your interface. Write domain error messages for that audience (the field, the rule, the identifier the user already knows) and never include secrets, raw tokens, SQL or internal paths. That is one more reason to map only `AppError` to responses: the message of an unexpected `KeyError` or `OSError` can expose internals, so it goes to the logs, and the user gets a generic 500.

## Common mistakes

**One `except Exception` clause for every error.** In a handler that builds responses, it turns every bug (a `KeyError` from a typo, a `TypeError` from a wrong argument) into a normal-looking response, and the traceback is never seen. Catch the domain base class and let everything else reach the top-level handler that logs it:

```py
# wrong: a typo in action() becomes a 500 response with an internal message
try:
    return 200, action()
except Exception as error:
    return 500, str(error)

# right: only errors raised on purpose become responses
try:
    result = action()
except AppError as error:
    return error.status, str(error)
return 200, result
```

Dispatching by exact class or class name (`type(error) is ConflictError`, a dict keyed by `type(error).__name__`) has the same flaw in a quieter form: a subclass written later, such as `EmailTaken(ConflictError)`, falls through to the default. `except` and `isinstance` follow inheritance.

## When to choose it

- **One base class per library or service** (`AppError`) with a few subclasses for the cases callers handle differently: not found, conflict, invalid input, unavailable.
- **A class attribute** (`status`, `retryable`) for data every subclass shares, resolved through inheritance.
- **An extra built-in base** when callers already catch that family.
- **Built-in exceptions directly** (`ValueError`, `KeyError`) inside small helpers with no API boundary; wrap them in domain errors at the boundary.
