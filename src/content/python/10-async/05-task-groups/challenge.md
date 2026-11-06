Finish the batch processor in `main.py`. A **handler** is an async function that takes one item and returns its result or raises.

## `process_batch(items, handler)`

Run `handler(item)` for every item **at the same time**, inside an `asyncio.TaskGroup`, and return the results in the order of `items`.

When a handler raises, the handlers still running must be **cancelled**, and they must have finished cancelling when `process_batch` raises. The exception that leaves `process_batch` is an **`ExceptionGroup`** whose `exceptions` hold the original errors (for one failure, a group with one `ValueError`).

The starter uses `asyncio.gather`: the other handlers keep running after a failure, and the error is not grouped.

## `handle_failures(items, handler)`

Call `process_batch(items, handler)` and return a report dict:

- every handler succeeded: `{"results": [...], "invalid": 0, "unavailable": 0}`;
- some handlers failed: `"results"` is `None`, `"invalid"` is the number of `ValueError`s and `"unavailable"` the number of `ConnectionError`s in the group. Several handlers can fail together when they fail before the group cancels them.

Any other exception type is **not** handled: it propagates out of `handle_failures` inside an `ExceptionGroup` (holding only the unhandled exceptions). Use `except*` clauses.
