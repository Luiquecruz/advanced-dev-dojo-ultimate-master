Errors thrown in any handler (also in `async` ones) reach the function you pass to `app.onError((err, c) => ...)`. It must return a response, like a handler.
---
Inside `onError`, test the most specific cases first with `instanceof`: `HTTPException` (use `err.status`), then `NotFoundError`, then `InsufficientFundsError`. Everything that falls through is unexpected.
---
The fallback is two lines: `console.error(err)` and `return c.json({ error: 'Internal Server Error' }, 500)`. For the route, `if (typeof amount !== 'number' || !(amount > 0)) throw new HTTPException(400, { message: 'Amount must be positive' })`, and `app.notFound((c) => c.json({ error: 'Route not found' }, 404))`.
