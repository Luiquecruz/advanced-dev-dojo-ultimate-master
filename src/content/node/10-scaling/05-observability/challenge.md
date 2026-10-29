Add observability to a `node:http` service without a library.

## 1. `createLogger(options?)`

```ts
createLogger({
  level?: 'debug' | 'info' | 'warn' | 'error',   // minimum level, default 'info'
  write?: (line: string) => void,               // default: console.log
  now?: () => Date,                             // default: () => new Date()
  bindings?: Record<string, unknown>,           // fields added to every line, default {}
  redact?: string[],                            // default ['password', 'token', 'authorization']
}): Logger
```

`Logger` has `debug`, `info`, `warn`, `error`, each `(msg: string, fields?: Record<string, unknown>) => void`, and `child(bindings): Logger`.

- Each call below the minimum level writes nothing. Otherwise it calls `write` **once** with `JSON.stringify` of `{ level, time: now().toISOString(), msg, ...bindings, ...fields }`.
- Top-level keys of bindings and fields whose name matches a `redact` entry (case-insensitive) are written as `"[REDACTED]"`.
- Values that are `Error` instances are written as `{ name, message, stack }`.
- `child(extra)` returns a logger with the same options and `bindings` merged with `extra`.

## 2. `withObservability(handler, { logger, now? })`

Wraps `handler(req, res, log)` into a `node:http` listener. `now` defaults to `() => performance.now()`.

1. Request id: the `x-request-id` request header when present, otherwise `randomUUID()` from `node:crypto`. Set it as the `X-Request-Id` response header before calling the handler.
2. `log` is `logger.child({ requestId })`.
3. When the response finishes, `log.info('request completed', { method, path, status, durationMs })`: `path` is the pathname **without the query string**, `status` the final status code, `durationMs` the rounded `now()` difference.
4. If the handler throws or rejects: `log.error('request failed', { err: error })`, and when headers were not sent yet answer `500` with `{ "error": "Internal Server Error" }` as JSON.

## 3. `percentile(values, p)`

Nearest-rank percentile: sort a copy ascending, return the element at position `Math.ceil(p / 100 * n)` (1-based, at least 1). Return `0` for an empty list.
