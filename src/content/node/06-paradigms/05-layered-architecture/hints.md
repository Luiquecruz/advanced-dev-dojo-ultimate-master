Write the service first and think only in domain terms: load, check the rule, throw a domain error or call the repository. `complete` can reuse `get` for the not-found case.
---
`create`: `const title = rawTitle.trim()`, then `if (!title) throw new ValidationError('Title is required')`, then `if (await this.tasks.findOpenByTitle(title)) throw new ConflictError(...)`. The repository already returns copies, so `this.tasks.update({ ...task, done: true })` is safe.
---
Each route is one line: read the input, call the service, wrap the result with `c.json(result, status)`. Use `'/:id{[0-9]+}'` and `Number(c.req.param('id'))`. For the body, `await c.req.json().catch(() => ({}))` and keep `title` only when `typeof title === 'string'`.
---
Thrown errors from handlers reach `app.onError(handleError)` (wired in `main.ts`). In `handleError`, check `error instanceof ValidationError` / `NotFoundError` / `ConflictError` and return `c.json({ error: error.message }, 400 | 404 | 409)`; keep the existing 500 fallback last.
