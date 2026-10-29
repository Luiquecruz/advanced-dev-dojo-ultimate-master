Work inside out: schema, then service, then auth, then routes and error handling. The **Run** output of `main.ts` shows the envelope for a create, a validation failure and a missing token, so you can check each step.
---
Service: scope everything by owner. `get` loads with `repository.findById(id)` and throws `new NotFoundError()` when `!bookmark || bookmark.ownerId !== ownerId`; `delete` calls `this.get(...)` first. `create` checks `repository.findByOwnerAndUrl(ownerId, input.url)` before building `{ id: this.deps.ids(), ownerId, ...input, createdAt: this.deps.now().toISOString() }`.
---
Auth: `/^Bearer\s+(\S+)$/.exec(c.req.header('Authorization') ?? '')`, look the token up in the map, throw `new UnauthorizedError()` when there is no user, `c.set('user', user)` and `await next()`. Register it with both `app.use('/bookmarks', ...)` and `app.use('/bookmarks/*', ...)`.
---
Routes read the user with `c.get('user').id` and the validated body with `c.req.valid('json')`. Create: `c.header('Location', ...)` then `c.json(bookmark, 201)`; delete: `c.body(null, 204)`. In `onError`, check `error instanceof AppError` first, then `HTTPException`, and keep the generic 500 last; spread `details` only when defined: `...(error.details ? { details: error.details } : {})`.
