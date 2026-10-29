Add offset and cursor pagination to a product catalog. The starter exports `products` (25 items with `id`, `name`, `category`, `price`, ordered by `id`), `listQuerySchema`, the cursor helpers and the `app`.

**Offset list: `GET /products`**

1. Complete `listQuerySchema` (query string, so coerce numbers):
   - `limit`: integer ≥ 1, default `10`, values above `50` are clamped to `50`
   - `offset`: integer ≥ 0, default `0`
   - `category`: optional string
   - `sort`: one of `'id'`, `'price'`, `'-price'`, `'name'`, `'-name'`, default `'id'` (a leading `-` means descending)
2. Validate with `zValidator('query', listQuerySchema, ...)`; invalid queries answer `400 { "error": "Invalid query" }`.
3. Answer `200 { items, total, limit, offset }`: filter by `category`, sort (without mutating `products`), then slice. `total` counts the filtered products before slicing; `limit` is the effective (clamped) value.

**Cursor feed: `GET /products/feed?limit=&cursor=`**

4. `encodeCursor(id)` returns `Buffer.from(JSON.stringify({ id })).toString('base64')`. `decodeCursor(cursor)` returns the `id` number, or `null` when the cursor is not valid base64 JSON with a numeric `id`.
5. The feed is ordered by `id`. Without `cursor` it starts at the beginning; with a cursor it returns products whose `id` is greater than the decoded id. `limit` follows the same rules as above (default `10`, clamped to `50`).
6. Answer `200 { items, nextCursor }`, where `nextCursor` is `encodeCursor(lastItem.id)` when more products exist after the page, otherwise `null`.
7. An invalid cursor answers `400 { "error": "Invalid cursor" }`.
