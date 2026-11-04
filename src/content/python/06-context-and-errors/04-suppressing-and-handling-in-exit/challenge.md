Write two suppressing context managers and a batch runner in `main.py`. Implement `__exit__` yourself; do not use `contextlib.suppress`.

## `Suppress(*types)`

- `__enter__` returns the manager.
- When the block raises an instance of one of `types` (subclasses included), `__exit__` suppresses it and execution continues after the `with` statement.
- Any other exception propagates unchanged (the same object). With no types, nothing is suppressed.
- A block that does not raise exits normally.

## `ErrorCollector(*types)`

- `__enter__` returns the collector itself.
- `errors` is a list, empty at first. When the block raises an instance of one of `types`, the collector appends that exception object to `errors` and suppresses it.
- Any other exception propagates unchanged and is not collected.
- One collector can be used for many `with` blocks; `errors` keeps the failures in the order they happened.

## `run_all(callables)`

Calls each callable (no arguments) in order inside **one** `ErrorCollector(Exception)` and returns a tuple `(results, errors)`:

- `results`: the return values of the calls that succeeded, in order.
- `errors`: the exceptions of the calls that failed, in order.

A failing call does not stop the batch. An exception that is not an `Exception` subclass (a stand-in for `KeyboardInterrupt` or `SystemExit`) is never collected: it stops `run_all` immediately and reaches the caller.
