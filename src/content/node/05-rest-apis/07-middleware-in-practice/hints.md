Built-in middleware is a function call: `app.use(requestId())`, `app.use(timing())`, `app.use('/api/*', cors({ ... }))`. Register them in the order of the contract, before the routes.
---
Your logger is `app.use(async (c, next) => { ... })`: remember `Date.now()`, `await next()`, then read `c.res.status`, `c.req.method`, `c.req.path` and `c.get('requestId')`.
---
The CORS options are `{ origin: options.allowedOrigins, allowMethods: ['GET', 'POST', 'PATCH', 'DELETE'], exposeHeaders: ['X-Request-Id'] }`. In the route: `startTime(c, 'db'); const user = await loadUser(); endTime(c, 'db');`.
