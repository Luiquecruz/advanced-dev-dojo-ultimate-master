Turn a cursor-paginated API into a lazy stream of items, then write two helpers to consume it.

A page fetcher has the type `FetchPage<T> = (cursor: string | null) => Promise<{ items: T[]; nextCursor: string | null }>`. The first page is requested with `null`; `nextCursor` is `null` on the last page.

1. `paginate(fetchPage)` is an **async generator** (`async function*`):
   - it yields the items one at a time, page after page, in order (empty pages are skipped naturally);
   - it calls `fetchPage(null)` first, then `fetchPage(nextCursor)` until `nextCursor` is `null`;
   - it is lazy: no request before the consumer starts iterating, and the next page is requested only when the consumer asks for an item beyond the current page;
   - an error thrown by `fetchPage` reaches the consumer's `for await` loop, after the items already yielded.
2. `take(source, count)` returns a promise of the first `count` items of any async iterable. It uses `for await` and `break`s as soon as it has `count` items, so the source stops (its `finally` blocks run and no further page is fetched). A shorter source returns all its items; `count <= 0` returns `[]`.
3. `chunk(source, size)` is an async generator that yields arrays of `size` items, plus a final shorter array for the remainder (no empty array at the end).

Press **Run** to see which pages are fetched for `take(..., 4)` and for `chunk(..., 2)`.
