`contextlib.ExitStack` is a context manager that holds **other** context managers and cleanup callbacks, collected at run time. When the stack closes, it calls them in reverse order of registration (LIFO), exactly as if the `with` statements had been nested by hand.

```py
from contextlib import ExitStack

def merge(paths):
    with ExitStack() as stack:
        stack.callback(print, "all files closed")                     # registered first, runs last
        files = [stack.enter_context(open(path)) for path in paths]   # 2 files or 200
        return [file.readline() for file in files]
# closes the last file first; if opening the third file fails, the first two are closed
```

`enter_context(manager)` calls `manager.__enter__()`, registers its `__exit__`, and returns what `__enter__` returned. `callback(function, *args)` registers a plain function, which never sees the exception and cannot suppress it. `push(exit_function)` registers an `__exit__`-shaped callback without entering anything.

## Coming from TypeScript and JavaScript

Without a stack, the JavaScript habit is an array and a loop in `finally`:

```ts
const opened: Resource[] = [];
try {
  for (const open of openers) opened.push(open());
  work(opened);
} finally {
  for (const resource of opened) resource.close();   // forward order, stops at the first throw
}
```

Ported to Python, that loop has two bugs. It closes in **opening order**, so the export file is closed before the broker channel that still writes to it. And if one `close()` raises, the loop stops and every later resource stays open, holding its lock. The newer JavaScript `DisposableStack` (`use`, `defer`, `move`, `dispose`) fixes both and is the direct counterpart of `ExitStack`.

## How it works

- **Partial failure**: inside `with ExitStack() as stack:`, a failing opener raises out of the block, and the stack closes everything entered so far. No bookkeeping of "how far did we get".
- **Failing closes**: the stack keeps unwinding after an `__exit__` raises. The remaining managers receive that exception as if it came from the block, and the last error raised propagates, with earlier ones chained as `__context__`.
- **Suppression composes**: an inner manager that suppresses or replaces the exception changes what the outer ones receive, as with nested `with` blocks.
- **Ownership transfer with `pop_all()`**: it moves every registered callback to a **new** `ExitStack` and returns it, without calling anything. The usual shape for an object that acquires resources in `__init__`:

```py
class Session:
    def __init__(self, openers):
        with ExitStack() as stack:                       # closes everything if __init__ fails
            self.resources = [stack.enter_context(open_()) for open_ in openers]
            self._stack = stack.pop_all()                # success: the old stack is now empty

    def close(self):
        self._stack.close()                              # LIFO; a second call finds nothing left
```

If any opener raises, `pop_all()` is never reached and the `with` closes what was opened. On success, the `with` closes an empty stack, and the resources live until `close()`.

- `close()` reports "no exception" to every registered `__exit__`. Callbacks are **not** run when the stack is garbage collected, so always close it.
- `AsyncExitStack` is the same tool for `async with` managers (module 10).

> **Status as of November 2026:** MDN marks JavaScript's `DisposableStack` as not yet Baseline (limited availability). In Python 3.15 (October 2026) `enter_context` and `push` accept `__enter__`/`__exit__` implemented by arbitrary descriptors, matching the `with` statement; the dojo runs 3.14.

## When to choose it

- **`ExitStack`** when the number of resources is only known at run time, when resources are acquired conditionally, or when an object must acquire several resources in its constructor and keep them (`pop_all()`).
- **Nested `with`** (or one `with` with several items) when the set of resources is fixed in the source: it is shorter and reads top to bottom.
- **`stack.callback`** for cleanups that are plain functions, such as deleting a temporary key or restoring a setting.
- **Not** a hand-written list of resources closed in a loop: it gets the order and the failing-close case wrong.
