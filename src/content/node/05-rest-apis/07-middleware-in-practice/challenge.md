Wire production middleware into `createApp(options)`. The starter exports `createApp({ allowedOrigins, log })` returning a Hono app with two routes: `GET /api/me` (answers `{ id: 1, name: 'Ada' }` after a fake database call) and `GET /api/fail` (always throws).

Register, in this order:

1. `requestId()` from `hono/request-id`: every response has an `X-Request-Id` header; a valid incoming `X-Request-Id` is reused.
2. Your own logging middleware that, **after** the response is produced, calls `options.log(entry)` once per request with:
   `{ requestId: string, method: string, path: string, status: number, durationMs: number }`
   (`requestId` is the same value as the response header). Failed requests (`500`) and unknown routes (`404`) are logged too.
3. `cors()` from `hono/cors` on `/api/*` with `origin: options.allowedOrigins`, `allowMethods: ['GET', 'POST', 'PATCH', 'DELETE']` and `exposeHeaders: ['X-Request-Id']`. Allowed origins get `Access-Control-Allow-Origin`; other origins do not.
4. `timing()` from `hono/timing`, and in `GET /api/me` wrap the `loadUser()` call with `startTime(c, 'db')` / `endTime(c, 'db')`, so the `Server-Timing` header contains `db` and `total`.
