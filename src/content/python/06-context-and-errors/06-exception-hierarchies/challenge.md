Model the errors of an order API in `main.py`.

## The hierarchy

| Class | Bases | `status` (class attribute) |
| --- | --- | --- |
| `AppError` | `Exception` | `500` (already written) |
| `ValidationError` | `AppError`, `ValueError` | `400` |
| `NotFoundError` | `AppError`, `LookupError` | `404` |
| `ConflictError` | `AppError` | `409` |

Every domain error is caught by `except AppError`, and the extra bases keep older handlers working: `except ValueError` still catches a `ValidationError`, and `except LookupError` a `NotFoundError`.

## `exit_status(error)`

Returns the `status` of the nearest class in the error's hierarchy that defines one. A subclass written later inherits its parent's status (`class EmailTaken(ConflictError)` gives `409`) unless it sets its own. Any exception that is not an `AppError` gives `AppError.status` (`500`).

## `parse_age(text)`

Returns the age as an `int`. Surrounding whitespace is fine (`" 7 "` gives `7`). Raises `ValidationError`, with the word `age` in its message, when the text is not a whole number (`"forty-two"`, `"4.5"`, `""`) or the age is outside `MIN_AGE`..`MAX_AGE` (0 to 150, both included). The message must not echo the input.

## `respond(action)`

Calls `action()` (no arguments) and returns a tuple:

- `(200, result)` when it returns normally;
- `(exit_status(error), str(error))` when it raises an `AppError`.

Any other exception (`KeyError`, `ZeroDivisionError`...) is a bug, not a response: `respond` must let the **same** exception propagate.
