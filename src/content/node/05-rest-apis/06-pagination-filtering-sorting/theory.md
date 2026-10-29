# Pagination, Filtering and Sorting

A list endpoint that returns everything works in development and falls over in production: 50 000 rows serialized per request, a slow database query, a frozen client. Every collection endpoint needs **a bounded page size**, and the way you paginate decides correctness and cost.

## Offset pagination

```text
GET /products?limit=10&offset=20&category=books&sort=-price
```

```ts
const filtered = products.filter((product) => !category || product.category === category);
const sorted = [...filtered].sort(byField(sort));
return c.json({ items: sorted.slice(offset, offset + limit), total: filtered.length, limit, offset });
```

In SQL this is `ORDER BY price DESC LIMIT 10 OFFSET 20`. It is easy, lets the UI jump to page 7 and show "page 3 of 12". Two costs:

- **Performance**: the database still reads and discards the first `offset` rows. Page 5 000 of a big table is slow.
- **Drift**: if a row is inserted or deleted while the user pages, every later row shifts. The user sees a duplicate or silently misses an item.

## Cursor (keyset) pagination

Instead of "skip N rows", the client says "continue after this row":

```text
GET /products/feed?limit=10
→ { "items": [...10 items...], "nextCursor": "eyJpZCI6MTB9" }

GET /products/feed?limit=10&cursor=eyJpZCI6MTB9
```

The server decodes the cursor and filters with the sort key: `WHERE id > 10 ORDER BY id LIMIT 11`. With an index on `id` this is fast at any depth, and inserts or deletes before the cursor do not shift the next page.

```ts
export function encodeCursor(id: number): string {
  return Buffer.from(JSON.stringify({ id })).toString('base64');
}
```

- The cursor is **opaque**: clients pass it back unchanged and never build it. Base64 of JSON lets you change its contents later (for example to `{ createdAt, id }`) without breaking clients. It is not a security boundary: anyone can decode it, so never put secrets in it and always validate it.
- Fetch `limit + 1` rows (or check what remains) to know whether a next page exists; `nextCursor: null` means the end.
- The sort key must be **unique and stable**. Sorting by `createdAt` alone breaks on equal timestamps; use the tuple `(createdAt, id)`.
- Cursors cannot jump to page 7 and make totals awkward. That is the trade-off.

## Filtering and sorting safely

- **Whitelist** sort fields and filter names. Passing `?sort=` straight into SQL `ORDER BY` is an injection vector (`ORDER BY` cannot be parameterized), and sorting by an unindexed column can take the database down.
- Use a convention and document it: `sort=price` ascending, `sort=-price` descending; repeated filters as `?category=books&category=games`.
- Add a **tie-breaker** (`id`) to every sort so pages are deterministic.
- **Clamp** `limit` (default 10–20, maximum 50–100). Rejecting `limit=1000` with `400` or clamping it are both fine; never let the client choose an unbounded page.
- `total` requires a `COUNT(*)` that can be as expensive as the query itself on large tables. Offer it only where the UI needs it.

## Response shape

Pick an envelope and use it for every list: `{ items, total, limit, offset }` or `{ items, nextCursor }`. Returning a bare array cannot grow later without breaking clients. Some APIs add a `Link` header (`rel="next"`) as GitHub does; on the frontend, TanStack Query's `useInfiniteQuery` maps directly to `getNextPageParam: (last) => last.nextCursor`.

## When to choose it

| Use | Choose |
| --- | --- |
| Admin tables, small or slow-changing data, "jump to page" UI | Offset |
| Infinite scroll, feeds, timelines, sync, exports, large tables | Cursor |
| Data that changes constantly while users page | Cursor |
| Search results ranked by relevance | Offset (or the search engine's own cursor) |

Most products end up with both: offset for back-office tables and cursor for user-facing feeds and APIs consumed by integrations.

## Working with AI

Tell the assistant which style you want, the maximum page size, the whitelisted sort fields with a tie-breaker, and the response envelope. Generated list endpoints often skip all of that. Review checklist:

- Every list has a default and maximum `limit`; no unbounded `findAll()`.
- Sort and filter fields are whitelisted; raw query values never reach `ORDER BY`.
- Every sort has a unique tie-breaker.
- Cursors are opaque, validated (invalid cursor → `400`), and `nextCursor` is `null` at the end.
- The cursor query filters on the sort key (`WHERE id > ?`), not `OFFSET` in disguise.
- `total` is only computed when needed.
