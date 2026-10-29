# Middleware in Practice

The middleware lesson of the HTTP module built a Koa-style `compose`. Hono uses the same **onion model**: each middleware runs code before `await next()`, lets the rest of the chain produce the response, then runs code after it. This lesson wires the cross-cutting concerns every production API needs: request ids, structured logs, timing and CORS.

```ts
app.use(async (c, next) => {
  const startedAt = Date.now();
  await next();
  console.log(c.req.method, c.req.path, c.res.status, Date.now() - startedAt);
});
```

Before `next()` you can read the request, reject it early (return a response without calling `next`) or store values with `c.set()`. After `next()`, `c.res` is the final response, also when a handler threw: `onError` already turned the error into a response, so the logger sees `500`.

## Order is behavior

```ts
app.use(requestId());
app.use(logRequests);
app.use('/api/*', cors({ origin: ['https://app.example.com'] }));
app.use(timing());
```

Middleware runs in registration order on the way in and in reverse on the way out. The request id must exist before the logger reads it; CORS must run before auth so a browser preflight (`OPTIONS`, which carries no credentials) is answered instead of rejected with `401`. A path argument (`'/api/*'`) scopes a middleware to part of the app.

## Built-in middleware worth knowing

| Middleware | Import | What it does |
| --- | --- | --- |
| `requestId()` | `hono/request-id` | Reuses a valid incoming `X-Request-Id` or generates a UUID, stores it as `c.get('requestId')` and echoes the header |
| `logger()` | `hono/logger` | Human-readable access log lines (`<-- GET /path`, `--> GET /path 200 3ms`) |
| `cors()` | `hono/cors` | CORS headers and preflight answers |
| `timing()` | `hono/timing` | `Server-Timing` header, with `startTime`/`endTime` for custom metrics |
| `secureHeaders()` | `hono/secure-headers` | Helmet-like security headers |
| `bodyLimit()` | `hono/body-limit` | Rejects large bodies with `413` |
| `timeout()` | `hono/timeout` | Fails slow requests |

## Request ids and structured logs

A request id ties together every log line of one request, across services when you forward the header to downstream calls. It is the first thing to ask for when debugging production.

`logger()` prints text for humans. Production logs go to a log platform (Datadog, Grafana Loki, CloudWatch) that indexes **structured** JSON, so you can query `status >= 500 AND path = "/api/orders"`. Write a small middleware and inject the sink, so tests and the production logger (pino in real projects) plug in the same way:

```ts
type Variables = RequestIdVariables;

const app = new Hono<{ Variables: Variables }>();

app.use(async (c, next) => {
  const startedAt = Date.now();
  await next();
  log({ requestId: c.get('requestId'), method: c.req.method, path: c.req.path, status: c.res.status, durationMs: Date.now() - startedAt });
});
```

Typing `Variables` makes `c.get('requestId')` a `string` instead of `unknown`. For reusable middleware, `createMiddleware` from `hono/factory` keeps those types.

Never log bodies, `Authorization` headers, cookies or tokens; logs are copied to many systems and kept for months.

## CORS: a browser rule, not a security wall

The browser blocks frontend JavaScript from reading cross-origin responses unless the server allows it. For non-simple requests (JSON body, `Authorization` header, `PATCH`/`DELETE`) the browser first sends a **preflight** `OPTIONS` request, and the server must answer with the allowed origin, methods and headers.

```ts
cors({
  origin: ['https://app.example.com'],
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE'],
  exposeHeaders: ['X-Request-Id'],
  credentials: true,
});
```

- `origin: '*'` cannot be combined with cookies (`credentials`); list the origins.
- `exposeHeaders` lets frontend code read custom response headers such as `X-Request-Id`.
- CORS does not protect the API from `curl`, scripts or other servers. Authentication and authorization do.

## Server-Timing

`Server-Timing: db;dur=12.3, total;dur=15.1` shows up in the browser DevTools Network panel next to the request. It is a cheap way to see where backend time goes without a tracing system. Do not expose it publicly on sensitive endpoints: timings can leak information.

## When to choose it

Use middleware for concerns that apply to many routes and do not depend on business rules: ids, logs, CORS, security headers, body limits, timeouts, authentication. Keep business decisions (who may edit this order) in handlers or services, where they are explicit and testable. Prefer built-in middleware over hand-written versions for CORS and security headers; write your own for logging formats and metrics your platform expects. At larger scale, OpenTelemetry instrumentation replaces hand-rolled timing with distributed traces.

## Working with AI

Ask for "request id, structured JSON access logs through an injected logger, CORS restricted to these origins, Server-Timing", and state the order. Review checklist:

- Order: request id before logging; CORS before auth; error handling still produces a logged status.
- The logger runs **after** `await next()` for status and duration, and logs failures too.
- No secrets, tokens or full bodies in logs.
- CORS lists explicit origins in production; no `'*'` with credentials.
- Custom headers the frontend needs are in `exposeHeaders`.
- Every middleware either `await next()` or returns a response, never neither.
