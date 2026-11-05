Finish a small paginated client in `main.py`.

## `paginate(fetch_page)`

An **async generator**. `fetch_page(number)` is an async function: for `number` 1, 2, 3... it returns the list of items on that page, or `None` past the last page. `paginate` yields every item, page after page, and stops at the first `None` without asking for more pages.

It is **lazy**: it requests page `n + 1` only after the consumer has received every item of page `n`. For pages `[["a", "b"], ["c"]]`, a consumer that records each item sees `fetch:1, item:a, item:b, fetch:2, item:c, fetch:3`.

## `collect(generator, limit=None)`

An async function that consumes an **async generator** and returns its items as a list. With `limit` (at least 1), it stops after `limit` items, without pulling one more, and the generator is **closed before `collect` returns**: its `finally` blocks have already run. Use `contextlib.aclosing`.

## `AsyncConnection(pages, recorder)`

An async context manager. `pages` is a list of pages (lists of items); `recorder` is a list of events.

- Entering it (`async with ... as connection`) sets `is_open` to `True`, appends `"open"` and returns the connection.
- Leaving it sets `is_open` to `False` and appends `"close"`, **whether or not the block raised**. An exception raised in the block propagates: `__aexit__` never suppresses it.
- `await connection.fetch_page(number)` returns `pages[number - 1]`, or `None` when `number` is past the last page, and raises `RuntimeError` when the connection is not open. It can be passed to `paginate`.
