A **context manager** is any object with `__enter__` and `__exit__`. The `with` statement calls `__enter__`, binds its **return value** to the `as` target, runs the block, and then calls `__exit__(exc_type, exc, traceback)` on every way out: normal end, `return`, `break`, or an exception.

```py
class Opened:
    def __init__(self, name):
        self.name = name

    def __enter__(self):
        print("open", self.name)
        return self                          # this is what `as` receives

    def __exit__(self, exc_type, exc, traceback):
        outcome = exc_type.__name__ if exc_type else "success"
        print("close", self.name, "after", outcome)
        return False                         # never swallow the exception

with Opened("report.csv") as report:
    print("writing", report.name)
# open report.csv / writing report.csv / close report.csv after success
```

## How it works

The language reference defines `with` by this expansion (simplified):

```py
manager = Transaction(store)
enter = type(manager).__enter__         # looked up on the class, not the instance
exit = type(manager).__exit__
value = enter(manager)
hit_except = False
try:
    transaction = value                 # the `as` target
    ...                                 # the block
except:
    hit_except = True
    if not exit(manager, *sys.exc_info()):
        raise                           # a false return value re-raises
finally:
    if not hit_except:
        exit(manager, None, None, None)
```

Read the consequences off the code:

- **The return value of `__exit__` decides suppression.** True swallows the exception and execution continues after the `with`; false re-raises it. On a normal exit the return value is ignored. Return `False` explicitly: `return True` "to report success" swallows every error (lesson 06).
- **If `__enter__` raises, `__exit__` never runs**, because the `try` has not started. An `__enter__` that acquires two things must release the first itself when the second fails (lesson 07 uses `ExitStack` for that).
- **`__exit__` also runs for `BaseException`** such as `KeyboardInterrupt`, so a rollback covers them too.
- **Raising inside `__exit__`** replaces the original exception, which survives only as `__context__` of the new one.
- **Special method lookup**: `__enter__` and `__exit__` are found on the type. An object without them raises `TypeError: ... does not support the context manager protocol`.
- **Several items** in one statement behave like nested `with` blocks: `with A() as a, B() as b:` enters `A` then `B`, and exits `B` first. Since 3.10 the items may be wrapped in parentheses across several lines.

## Common mistakes

**An `__enter__` with no `return`.** The `as` target receives what `__enter__` returns, not the manager, and a method without `return` returns `None`. The block then fails on its first attribute access, far from the real bug:

```py
# wrong: `as transaction` binds None
def __enter__(self):
    self.store.begin()

# right: hand the caller the object it should use
def __enter__(self):
    self.store.begin()
    return self
```

**An `__exit__` that ignores its arguments.** Committing unconditionally commits a failed block, and `return True` "to report success" swallows every exception. Check `exc_type` (it is `None` on success), roll back on failure, and return `False`.

## When to choose it

- **A class with `__enter__`/`__exit__`** when the manager keeps state the caller reads after the block (`timer.elapsed`, `transaction.error`), when it needs several methods, or when it must be reusable.
- **`@contextmanager`** (next lesson) for a plain setup-and-teardown pair.
- **`try/finally`** for one cleanup in one function that nobody else repeats.
- **Never** garbage collection or `__del__` for releasing locks, connections or files: they give no timing and no ordering guarantee.
