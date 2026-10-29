# Calling Other Services

Most backends are also clients: they call payment providers, internal services, AI APIs, the GitHub API. Every such call can be slow, fail, or return something unexpected, and your API must stay predictable when that happens. Node 18+ ships the same `fetch` you use in the browser (implemented by undici), so the API is familiar; the defaults and the responsibilities are not.

## fetch does not fail on HTTP errors

```ts
const response = await fetch('https://api.example.com/users/42');
const user = await response.json();
```

This looks fine and is wrong twice. `fetch` only rejects when **no response** arrives (DNS failure, refused connection, reset, abort). A `404` or `500` resolves normally, so `user` might be `{ "error": "Not found" }`, and `response.json()` throws a `SyntaxError` if a proxy returned an HTML error page. Always branch on `response.ok` / `response.status` before reading the body.

## Always set a timeout

Server-side `fetch` has no practical timeout: undici waits minutes for headers. A slow upstream then holds your request open, your users wait, and under load the stuck requests pile up until your service falls over too: one slow dependency becomes a full outage. Abort with a deadline:

```ts
const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
```

When the timer fires, `fetch` rejects with a `TimeoutError` (`DOMException`). Checking `signal.aborted` after a rejection tells timeouts apart from network errors without depending on error names. To also stop when the client of *your* API disconnects, combine signals: `AbortSignal.any([AbortSignal.timeout(2000), request.signal])` (the async module covers cancellation in depth). Pick the timeout from the upstream's normal latency and your own budget: if your endpoint must answer in 3 s and calls two services in sequence, neither can get 3 s.

## Map failures to your own errors

Callers of your API should not see the upstream's raw error bodies or status codes. Translate at the boundary:

| What happened | Your status | Why |
| --- | --- | --- |
| upstream `404` for the requested entity | `404` | the thing the client asked for does not exist |
| upstream `5xx` or unexpected `4xx` | `502 Bad Gateway` | a dependency failed, not your client's request |
| no response before the deadline | `504 Gateway Timeout` | the dependency was too slow |
| connection refused, DNS failure | `502` (or `503` if you know it is down) | dependency unreachable |
| body is not the JSON you expected | `502` | contract broken upstream |

A small error class carrying `status` and a stable `code` lets the HTTP layer render every case consistently and lets logs and dashboards count them:

```ts
class UpstreamError extends Error {
  constructor(message: string, readonly status: number, readonly code: string) {
    super(message);
  }
}
```

An upstream `401` usually means *your* credentials are wrong: that is your outage (log it loudly, return `502`), not the client's authentication problem. Never forward an upstream `401` to your own client.

## Parallel calls and partial failure

Independent calls should run in parallel: `Promise.all([getUser(id), getPosts(id)])` takes as long as the slowest, not the sum. `Promise.all` rejects on the first failure, which is right when every part is required. When some data is optional (recommendations, avatars), use `Promise.allSettled` and degrade gracefully instead of failing the whole response.

## Retries, carefully

Retrying can turn a blip into a success, or a struggling upstream into a dead one. Retry only idempotent requests (or `POST` with an `Idempotency-Key`), only on timeouts, network errors, `429`, `502`, `503`, `504`, with exponential backoff and jitter, and with a total deadline. Never retry `400`, `401`, `404` or `422`. For dependencies that fail repeatedly, a **circuit breaker** stops calling them for a while and fails fast instead.

## Trust nothing in the body

A `200` with JSON is still untrusted input: fields can be missing, renamed or `null` after an upstream deploy. Validate the shape you rely on (Zod in a later lesson), and read only the fields you need.

## When to choose it

Use the built-in `fetch` for most calls: no dependency, web-standard, works in Node, Bun, Deno and edge runtimes. Choose a wrapper (`ky`, `ofetch`) when you want retries, timeouts and JSON handling as defaults across many calls, `undici` directly for fine control over connection pools, and the vendor's official SDK (Stripe, AWS, OpenAI) when one exists: it handles auth, retries, pagination and idempotency for you. `axios` remains common in existing code, but new server code rarely needs it.

## Working with AI

Tell the assistant the timeout, which failures map to which of your status codes, whether retries are allowed, and which fields of the response you need. Review generated client code for:

- no timeout or `AbortSignal` on outgoing calls;
- `response.json()` without checking `response.ok`;
- upstream error bodies or status codes forwarded to your clients;
- every failure turned into a `500`;
- retries on non-idempotent requests or on `4xx`, without backoff or a cap;
- sequential `await`s for independent calls;
- secrets for the upstream hard-coded or logged.
