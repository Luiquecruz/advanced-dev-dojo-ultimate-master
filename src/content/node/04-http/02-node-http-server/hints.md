`sendJson` needs two calls: `res.writeHead(status, { 'Content-Type': 'application/json' })` and `res.end(JSON.stringify(data))`.
---
Start the listener with `const { pathname, searchParams } = new URL(req.url ?? '/', 'http://localhost');` and compare `pathname`, never `req.url`, so the query string does not break `/todos?done=true`.
---
For `/todos/:id` use `/^\/todos\/(\d+)$/.exec(pathname)` and `Number(match[1])`. Return early from each branch (`return sendJson(...)`) and finish the listener with the generic `404 { error: 'Not found' }`, which also covers non-GET methods.
