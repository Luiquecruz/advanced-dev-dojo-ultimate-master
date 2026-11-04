`__exit__` decides the fate of the block's exception with its return value: **true swallows it** and execution continues after the `with` statement, false lets it propagate. Suppressing is a decision about *which* exceptions are expected, so a suppressing manager checks the exception's class before returning `True`.

```py
import os
from contextlib import suppress

with suppress(FileNotFoundError):        # deleting a file that is already gone is fine
    os.remove("/tmp/report.lock")
print("continues here either way")
```

`contextlib.suppress(*exceptions)` is the standard version: it matches with `isinstance`, so subclasses count (`suppress(LookupError)` also swallows `KeyError` and `IndexError`), and with no arguments it suppresses nothing.

## Coming from TypeScript and JavaScript

JavaScript `catch` cannot filter by type, so the habit is to catch everything and decide later, or not decide at all:

```ts
const errors: unknown[] = [];
for (const job of jobs) {
  try { results.push(job()); } catch (e) { errors.push(e); }   // catches anything thrown
}
```

The literal Python ports are `except:`, `except BaseException:`, or an `__exit__` that returns `True` whenever `exc` is set. All three also catch exceptions that are not errors in your program: `KeyboardInterrupt` (Ctrl+C), `SystemExit` (`sys.exit()`), `GeneratorExit` and `asyncio.CancelledError`. Swallowing them means Ctrl+C does nothing, `sys.exit()` does not exit, and cancelled tasks refuse to stop, which breaks task groups and timeouts (module 10).

```py
def __exit__(self, exc_type, exc, traceback):
    if exc is not None:
        self.errors.append(exc)
    return True                                # also swallows KeyboardInterrupt
```

Collect `Exception` subclasses at most, and only the ones the caller declared.

## How it works

- On success all three arguments are `None`. `issubclass(exc_type, ...)` then raises `TypeError` because `None` is not a class; `isinstance(exc, self.types)` with an `exc is None` check is the safe test.
- `isinstance` accepts a tuple of classes, which is exactly what `*types` collects.
- An **error collector** is a suppressing manager that also keeps the exception objects. One instance can be entered many times in a loop: each `with` block is one attempt, and `collector.errors` keeps the failures in order for a report or for an `ExceptionGroup` (lesson 08).
- Suppression ends the block at the line that raised. Statements after it inside the block do not run; execution resumes **after** the `with` statement.
- `__exit__` returning `None` (no `return` statement) means "do not suppress". Explicit `return False` documents that it was a decision.

> **Status as of November 2026:** since Python 3.12, `contextlib.suppress` also handles exception groups: it removes the matching exceptions from a `BaseExceptionGroup` and re-raises the rest in a new group built with `derive()`.

### Security note

Swallowing exceptions hides failures that matter, including security ones: a `PermissionError` from an access check inside `suppress(Exception)` turns into "carry on as if allowed". Keep suppression narrow (one expected type, one statement), never catch `BaseException` outside a top-level runner that logs and exits, and treat `except Exception: pass` as a bug. When collected errors are reported to users, show a summary (which item failed, which rule): exception messages and tracebacks can carry internal paths, queries or tokens, and belong in logs.

## When to choose it

- **`contextlib.suppress(SpecificError)`** when an expected failure means "nothing to do": deleting a missing file, removing an absent key.
- **An error collector** for batch work where every item must be attempted and failures reported together: imports, validations, health checks.
- **`try/except SpecificError`** when the failure needs a different code path, not silence.
- **Never** a suppressing manager for `Exception` or `BaseException` around code you do not own: let unexpected errors reach the top-level handler.
