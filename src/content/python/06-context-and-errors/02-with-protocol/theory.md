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

## Coming from TypeScript and JavaScript

JavaScript has `try/finally` and, newer, `using` declarations: when the block ends, the runtime calls the object's `[Symbol.dispose]()`. A Python port of that habit breaks in two places.

```ts
class Transaction {
  constructor(private store: Store) { store.begin(); }
  [Symbol.dispose]() { this.store.commit(); }   // runs after success AND after a throw
}
using tx = new Transaction(store);              // tx is the object itself
```

```py
class Transaction:
    def __enter__(self):
        self.store.begin()                      # no return: `as tx` binds None

    def __exit__(self, *exc_info):
        self.store.commit()                     # commits a failed block
```

- **`as` binds what `__enter__` returns**, not the object after `with`. `using tx = new X()` binds the object; in Python you must `return self` (or whatever the caller should use, like a file object or a cursor).
- **`__exit__` sees the exception.** A disposer receives no arguments, so it cannot tell success from failure and cannot stop the error. `__exit__` receives the exception type, the exception and its traceback (all `None` on success), so a transaction commits only on success and rolls back otherwise.

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

- **The return value of `__exit__` decides suppression.** True swallows the exception and execution continues after the `with`; false re-raises it. On a normal exit the return value is ignored. Return `False` explicitly: `return True` "to report success" swallows every error (lesson 04).
- **If `__enter__` raises, `__exit__` never runs**, because the `try` has not started. An `__enter__` that acquires two things must release the first itself when the second fails (lesson 05 uses `ExitStack` for that).
- **`__exit__` also runs for `BaseException`** such as `KeyboardInterrupt`, so a rollback covers them too.
- **Raising inside `__exit__`** replaces the original exception, which survives only as `__context__` of the new one.
- **Special method lookup**: `__enter__` and `__exit__` are found on the type. An object without them raises `TypeError: ... does not support the context manager protocol`.
- **Several items** in one statement behave like nested `with` blocks: `with A() as a, B() as b:` enters `A` then `B`, and exits `B` first. Since 3.10 the items may be wrapped in parentheses across several lines.

> **Status as of November 2026:** TC39 lists Explicit Resource Management (`using`, `Symbol.dispose`, `DisposableStack`) as a finished proposal with ES2027 as its expected edition, and MDN does not yet mark `using` as Baseline. Its disposers still receive no error and cannot suppress one; errors thrown during disposal are aggregated into a `SuppressedError`.

## When to choose it

- **A class with `__enter__`/`__exit__`** when the manager keeps state the caller reads after the block (`timer.elapsed`, `transaction.error`), when it needs several methods, or when it must be reusable.
- **`@contextmanager`** (next lesson) for a plain setup-and-teardown pair.
- **`try/finally`** for one cleanup in one function that nobody else repeats.
- **Never** garbage collection or `__del__` for releasing locks, connections or files: they give no timing and no ordering guarantee.
