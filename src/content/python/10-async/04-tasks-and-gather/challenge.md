Write three helpers in `main.py` for a dashboard that loads data from several services. A **source** is an async function with no parameters, for example `async def users(): ...`; calling it returns a coroutine.

## `fetch_all(sources)`

Run every source **at the same time** and return the list of their values in the order of `sources`, whatever order they finish in. If a source raises, `fetch_all` raises that exception (the default behavior of `asyncio.gather`).

## `fetch_settled(sources)`

Run every source at the same time and return a tuple `(values, errors)`:

- `values`: the values of the sources that succeeded, in input order;
- `errors`: the exception objects of the sources that failed, in input order.

Nothing is raised, and a failure never discards the other values. Use `return_exceptions=True`.

## `first_done(coroutines)`

Receives a list of **coroutine objects**. Run them as tasks and return the result of the first one to finish. Before returning, **cancel every other task and wait until they have finished cancelling**, so their cleanup has run when `first_done` returns. If the first task to finish raised, its exception propagates.

The tests check concurrency with recorded start and end events and use `asyncio.sleep(0)` ticks, never real delays.
