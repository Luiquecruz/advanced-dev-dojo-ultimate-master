Compare levels by position: `LEVELS.indexOf(lineLevel) < LEVELS.indexOf(level)` means "too verbose, skip". Build the entry as `{ level: lineLevel, time: now().toISOString(), msg }` and copy every key of `{ ...bindings, ...fields }` into it through a small `serialize(key, value)` helper.
---
`serialize` returns `'[REDACTED]'` when `hidden.has(key.toLowerCase())` (build `hidden` once as a `Set` of lowercased names), `{ name, message, stack }` for `value instanceof Error`, and the value otherwise. `child(extra)` is `createLogger({ ...options, bindings: { ...bindings, ...extra } })`.
---
In `withObservability`, take `startedAt = now()` first, pick `req.headers['x-request-id'] || randomUUID()`, call `res.setHeader('X-Request-Id', requestId)` and create `log = logger.child({ requestId })`. Register `res.on('finish', ...)` before running the handler; inside it compute the path with `new URL(req.url ?? '/', 'http://localhost').pathname`.
---
Wrap `await handler(req, res, log)` in `try/catch`; in the `catch`, `log.error('request failed', { err: error })` and, if `!res.headersSent`, write the 500 JSON response. `percentile`: `[...values].sort((a, b) => a - b)`, `rank = Math.max(1, Math.ceil(p / 100 * n))`, return `sorted[rank - 1]`.
