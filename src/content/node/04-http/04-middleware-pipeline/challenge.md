Implement a Koa-style middleware pipeline and the middleware of a small API. The `Context`, `Middleware` and `Next` types are in the starter.

1. `compose(middleware: Middleware[])` returns `(ctx: Context, next?: Next) => Promise<void>`:
   - runs the middleware in order; each receives `ctx` and a `next` that runs the rest of the chain and returns a promise;
   - after the last middleware, `next` calls the optional final `next` argument;
   - a middleware that does not call `next` stops the chain;
   - errors (including synchronous throws) reject the returned promise;
   - calling `next()` twice in the same middleware rejects with `new Error('next() called multiple times')`.
2. `errorHandler: Middleware` awaits `next()` inside `try/catch`. An error with a numeric `status` between 400 and 499 sets `ctx.status` to it and `ctx.body` to `{ error: message }`; any other error is logged with `console.error` and sets `500 { error: 'Internal server error' }`.
3. `responseTime(now = Date.now): Middleware` sets `ctx.responseHeaders['X-Response-Time']` to `` `${end - start}ms` `` after the downstream middleware finished, measuring with `now()`.
4. `requireApiKey(expected: string): Middleware` answers `401 { error: 'Unauthorized' }` without calling `next` when `ctx.requestHeaders['x-api-key']` differs from `expected`; otherwise it calls `next`.
5. `createListener(middleware: Middleware[])` returns a `node:http` listener that builds a context (`method`, `path` = URL pathname, `requestHeaders` = `req.headers`, `status: 404`, `body: { error: 'Not found' }`, `responseHeaders: {}`), runs the composed middleware, then writes `ctx.status`, `Content-Type: application/json` plus `ctx.responseHeaders`, and `JSON.stringify(ctx.body)`. If the pipeline rejects, it answers `500 { error: 'Internal server error' }`.

The exported `app` (already wired in the starter) chains `errorHandler`, `responseTime()`, `requireApiKey(process.env.API_KEY ?? 'dev-key')` and the routes.
