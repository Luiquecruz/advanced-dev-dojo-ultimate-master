1. Write `sendJson` first: status and `Content-Type` through `writeHead`, then `end` with the serialized body. Every branch reuses it, so there is exactly one place that ends responses.
2. In the listener, reject anything that is not `GET` with the generic 404 before routing.
3. Parse the URL once with `new URL(req.url, base)` and route on `pathname`.
4. `/health` and `/todos` are exact matches; for `/todos` read `searchParams.get('done')`: `null` means no filter, otherwise compare each `todo.done` with `done === 'true'`.
5. `/todos/:id` needs a pattern with a capture group; convert the id with `Number` and answer 404 with the specific message when `find` returns `undefined`.
6. Anything left falls through to the generic 404, so no request is ever left without `res.end()`.
