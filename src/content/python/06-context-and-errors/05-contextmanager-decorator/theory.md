`contextlib.contextmanager` turns a generator function with **one `yield`** into a context manager. The code before `yield` is the setup, the yielded value is what `as` receives, and the code after `yield` is the teardown.

```py
from contextlib import contextmanager

@contextmanager
def opened(path, log):
    log.append(f"open {path}")
    try:
        yield path.upper()            # the `as` target; the with block runs here
    finally:
        log.append(f"close {path}")   # runs after success and after an exception

log = []
with opened("report.csv", log) as handle:
    log.append(f"write {handle}")
# ['open report.csv', 'write REPORT.CSV', 'close report.csv']
```

## How it works

Calling the decorated function returns a manager object. `__enter__` runs the generator up to the `yield` and returns the yielded value. `__exit__` resumes it:

- **Success**: the generator continues after `yield` and must finish. A second `yield` raises `RuntimeError: generator didn't stop`; a generator that never yields raises `RuntimeError: generator didn't yield`.
- **Exception**: the manager calls `generator.throw(error)`. If the generator lets it escape (the normal case, with `finally` for cleanup), `with` re-raises it. If the generator **catches it and finishes**, the exception is suppressed. That is why `except Exception: log(...)` without `raise` around the `yield` silently swallows every error.
- **A new exception** raised in the teardown replaces the original, which survives as its `__context__`.

The managers are **one-shot**: each `with` needs a fresh call such as `opened(...)`, because the generator is used up after one block.

### As a decorator

`@contextmanager` managers inherit from `contextlib.ContextDecorator`, so the same object also wraps a function: `@section(log, "job")` above `def job()` runs the setup and teardown around **every call**, creating a fresh generator each time.

> **Status as of November 2026:** the dojo runs CPython 3.14, where a `ContextDecorator` (including a `@contextmanager` used with `@`) applied to a **generator function** exits as soon as the generator object is created, before its body runs. Python 3.15 (October 2026) changed this to keep the context open across iteration and `await`. Do not rely on either behavior in code that must run on both.

### Ready-made managers

Before writing one, check `contextlib`: `redirect_stdout`, `suppress`, `chdir` (3.11), `nullcontext`, `closing`, and `asynccontextmanager` for `async with`. `redirect_stdout(target)` sends `print` output to any file-like object while the block runs; the usual target is an `io.StringIO()`, an in-memory text file whose `getvalue()` returns everything written to it.

## Common mistakes

**Teardown after `yield` without `finally`.** When the `with` block raises, the exception is thrown into the generator at the `yield`, so the lines after it never run: the setting, the redirected `sys.stdout` or the held lock is never restored.

```py
# wrong: an exception in the block skips the restore
@contextmanager
def temporary_setting(settings, key, value):
    previous = settings[key]
    settings[key] = value
    yield
    settings[key] = previous

# right: finally runs on every way out
@contextmanager
def temporary_setting(settings, key, value):
    previous = settings[key]
    settings[key] = value
    try:
        yield
    finally:
        settings[key] = previous
```

Restoring an absent key as `None` is the second trap: `settings.get(key)` returns `None` for a missing key, and writing it back adds a real entry. A private sentinel (`_MISSING = object()`) tells "absent" from "present with `None`", and an absent key is removed again.

## When to choose it

- **`@contextmanager`** for a setup-and-teardown pair around a block: temporary settings, redirected streams, timing, a log section. Always put the teardown in `finally`.
- **A class with `__enter__`/`__exit__`** when callers need state or methods on the manager after the block, when it must be reusable, or when the exit logic branches on the exception in several ways.
- **A `contextlib` ready-made** when one already does the job; `redirect_stdout(buffer)` is the standard version of the `captured_output` you write here.
