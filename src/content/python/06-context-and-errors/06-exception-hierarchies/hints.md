A class can list several bases: `class ValidationError(AppError, ValueError):`. Each subclass then only needs its own `status = ...` line.
---
Attribute lookup on a class already walks the MRO: `type(error).status` finds the nearest definition. Guard it with `isinstance(error, AppError)` and fall back to `AppError.status`. Avoid comparing class names or exact types: subclasses written later must keep working.
---
In `parse_age`, call `int(text)` inside `try/except ValueError` and raise `ValidationError("age must be a whole number")` from the handler; then check the range. In `respond`, catch `AppError` only, and return `(200, result)` after the `try` (or in `else`) so nothing else is caught.
