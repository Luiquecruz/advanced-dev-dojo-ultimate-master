Build a small read-only todo API with `node:http`, no framework.

The starter exports a `todos` array and a `server` created with `createServer`. Make the request listener answer:

| Request | Status | JSON body |
| --- | --- | --- |
| `GET /health` | `200` | `{ "status": "ok" }` |
| `GET /todos` | `200` | the whole `todos` array |
| `GET /todos?done=true` | `200` | only the todos with `done: true` (`done=false` returns the others) |
| `GET /todos/:id` (existing id) | `200` | that todo |
| `GET /todos/:id` (unknown id) | `404` | `{ "error": "Todo not found" }` |
| anything else (other paths or methods) | `404` | `{ "error": "Not found" }` |

Rules:

1. Export a helper `sendJson(res, status, data)` and use it for every response. It sets `Content-Type: application/json` and ends the response with `JSON.stringify(data)`.
2. Parse `req.url` with `new URL(req.url, 'http://localhost')`; the query string must not break routing (`/todos?done=true` is still `/todos`).
3. Keep `server.listen(PORT)` where it is so **Run** starts the server.
