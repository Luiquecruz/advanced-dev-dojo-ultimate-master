Build a small book catalog API with Hono.

The starter exports a `books` array and an `app` created with `new Hono()`. Register these routes on `app`:

| Request | Status | Response |
| --- | --- | --- |
| `GET /health` | `200` | the text `ok` (`text/plain`) |
| `GET /books` | `200` | JSON array of books, with the header `X-Total-Count` set to the number of books returned |
| `GET /books?author=<text>` | `200` | only the books whose `author` contains `<text>`, case-insensitive |
| `GET /books?limit=<n>` | `200` | at most `n` books (filters apply first) |
| `GET /books/:id` (existing id) | `200` | that book as JSON |
| `GET /books/:id` (unknown numeric id) | `404` | `{ "error": "Book not found" }` |
| `GET /books/abc` (non-numeric id) | `404` | not handled by your route: restrict `:id` to digits |
| `POST /books` with JSON `{ title, author }` | `201` | the created book `{ id, title, author }`, `id` one above the current highest id |

Rules:

1. Read parameters with `c.req.param()` and query values with `c.req.query()`, and convert them to numbers yourself.
2. Return every response with the context helpers (`c.text`, `c.json`, `c.header`).
3. Keep the `main()` demo at the bottom so **Run** prints a few responses.
