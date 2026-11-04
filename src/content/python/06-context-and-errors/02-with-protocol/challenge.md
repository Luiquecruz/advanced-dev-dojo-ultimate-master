Write two class-based context managers for a payment service in `main.py`. Both implement `__enter__` and `__exit__(exc_type, exc, traceback)` themselves (no `contextlib`).

## `Timer(clock)`

`clock` is a function with no arguments that returns the current time in seconds as a float (the tests pass a fake clock).

- `elapsed` is `None` until the block ends.
- `__enter__` reads the clock once and returns the `Timer` itself, so `with Timer(clock) as timer:` binds the same object.
- `__exit__` reads the clock once more and stores `elapsed = end - start`, also when the block raised.
- A `Timer` never suppresses an exception.

## `Transaction(store)`

`store` has three methods: `begin()`, `commit()` and `rollback()`.

- `error` is `None` until a block fails.
- `__enter__` calls `store.begin()` and returns the `Transaction` itself.
- When the block succeeds, `__exit__` calls `store.commit()` once.
- When the block raises, `__exit__` stores the exception it received in `error`, calls `store.rollback()` (never `commit()`), and lets the **same** exception propagate.

Several managers in one `with` statement must behave like nested blocks: with `with Transaction(a), Transaction(b):`, the store of `b` is rolled back or committed before the store of `a`.
