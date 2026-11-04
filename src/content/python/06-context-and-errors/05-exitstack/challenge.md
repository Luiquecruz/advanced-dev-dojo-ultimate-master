A capture job opens a database connection, a broker channel and one export file per active region, so the number of resources is only known at run time. Write the two helpers in `main.py` with `contextlib.ExitStack`.

An **opener** is a function with no arguments that returns a context manager (for example `lambda: Connection("db")`). "Opening" a resource means entering that context manager; its **entered value** is what `__enter__` returns. "Closing" it means calling its `__exit__`.

## `open_all(openers)`

A context manager (write it with `@contextmanager`) used as `with open_all(openers) as values:`.

- It opens the resources in the order of `openers` and yields the list of entered values, in the same order.
- When the block ends, normally or with an exception, every resource is closed in **reverse** order.
- If an opener or an `__enter__` fails, the resources opened so far are closed in reverse order, the remaining openers are never called, and the error propagates.
- If one resource raises while closing, the others are still closed, and an error propagates to the caller.

## `ResourcePool(openers)`

An object that owns its resources beyond the constructor.

- `ResourcePool(openers)` opens every resource and stores the entered values, in order, in `pool.resources`. They stay **open** after the constructor returns.
- If one fails to open, the constructor closes the ones it already opened (reverse order) and lets the error propagate.
- `pool.close()` closes every resource in reverse order. Calling it again does nothing.
- The pool is also a context manager: `with ResourcePool(openers) as pool:` binds the pool and calls `close()` when the block ends.

Hand the open resources from the constructor's temporary stack to the pool with `ExitStack.pop_all()`.
