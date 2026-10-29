Every route is `app.<method>(path, (c) => ...)` and the handler must `return` a response: `return c.text('ok')`, `return c.json(data)`, `return c.json(data, 404)`.
---
In `GET /books`, read both query values with `c.req.query('author')` and `c.req.query('limit')`. Filter first, then `slice(0, Number(limit))` only when `limit` is defined, then call `c.header('X-Total-Count', String(result.length))` before returning.
---
Restrict the parameter with a pattern: `app.get('/books/:id{[0-9]+}', ...)`. For `POST`, `const input = await c.req.json()`, compute `Math.max(0, ...books.map((b) => b.id)) + 1`, push the book and `return c.json(book, 201)`.
