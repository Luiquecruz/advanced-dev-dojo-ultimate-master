# Observability

On the frontend you debug with DevTools open on the failing page. In production a backend has no DevTools: thousands of requests interleave on several instances, and the bug report says "checkout was slow yesterday around 3 pm". **Observability** is the ability to answer such questions from the outside, using the signals your service emits. There are three classic signals:

| Signal | Answers | Example |
| --- | --- | --- |
| Logs | what happened in this specific request? | `{"level":"error","requestId":"…","msg":"payment declined"}` |
| Metrics | how much, how often, how fast, in aggregate? | `http_requests_total`, p95 latency, event loop lag |
| Traces | where did the time go across services? | a span tree: API 420 ms → DB 30 ms → payment API 370 ms |

## Structured logs

`console.log('User ' + id + ' failed login')` produces text that a human can read and a machine cannot query. **Structured logs** are one JSON object per line:

```json
{"level":"warn","time":"2026-03-01T15:04:05.000Z","msg":"login failed","requestId":"6f1c…","userId":42,"reason":"bad_password"}
```

Log platforms (Datadog, Grafana Loki, Elastic, CloudWatch) index the fields, so you can filter `requestId = "6f1c…"` or count `reason = "bad_password"` per minute. Rules that make logs useful:

- **Levels** (`debug`, `info`, `warn`, `error`) with a configurable minimum, so production is not flooded with debug output.
- **Stable message strings** and data in fields: `msg: "login failed"` plus `userId`, not the id inside the message.
- **Child loggers** that carry context (`requestId`, `userId`, `jobId`) automatically, so every line of a request can be found together.
- **Redaction** of secrets and personal data: passwords, tokens, `authorization` headers, card numbers. A leaked token in a log index is a security incident.
- **Errors as objects** with `name`, `message` and `stack`; `JSON.stringify(new Error('x'))` gives `{}`.

In Node, **pino** is the standard structured logger (fast, child loggers, redaction); Hono and Fastify integrate with it.

## Request ids and correlation

A **request id** ties together everything that happened for one request: the access log line, the error it threw, the SQL it ran, the message it enqueued. Reuse an incoming `X-Request-Id` (set by a gateway or the calling service) or generate one with `crypto.randomUUID()`, return it in the response header (support can ask users for it), and pass it to downstream calls. In real Node, `AsyncLocalStorage` propagates it implicitly through `await` chains so you do not thread a logger through every function; this lesson passes the logger explicitly.

## Metrics: RED, USE and percentiles

For request-driven services, track **RED**: Rate (requests per second), Errors (failed requests per second), Duration (latency distribution). For resources, **USE**: Utilization, Saturation, Errors (CPU, memory, event loop lag, connection pools).

Report latency as **percentiles**, not averages. If 98 requests take 20 ms and 2 take 3 seconds, the average is 80 ms, which describes nobody. p50 (20 ms) is the typical user, p99 (3 s) is the user who is about to complain. A common definition is the nearest-rank percentile: sort the values and take the one at position `ceil(p / 100 × n)`. Metric systems (Prometheus histograms, OpenTelemetry) compute approximate percentiles from buckets so they never store every value.

**Cardinality** is the trap: a metric label is multiplied by every distinct value. `route="/users/:id"` is fine; `path="/users/48213"` or `userId` as a label creates millions of time series and a large bill.

## Traces and OpenTelemetry

A trace follows one request across services as a tree of **spans** with timings. **OpenTelemetry** is the vendor-neutral standard for logs, metrics and traces: its Node SDK auto-instruments `http`, `fetch`, popular database drivers and frameworks, and exports to any backend (Jaeger, Grafana Tempo, Honeycomb, Datadog). The W3C `traceparent` header carries the trace across service boundaries, the same way a request id does.

## What not to log

Request and response bodies by default (personal data, size), secrets, full query strings (tokens end up in URLs), and one line per loop iteration. Log the decision points: request completed, external call failed, job retried, permission denied.

## When to choose it

Every production service needs structured logs with request ids and a basic RED dashboard from day one; they are cheap and the first incident pays for them. Add tracing (OpenTelemetry auto-instrumentation) as soon as a request crosses more than one service or a slow endpoint needs explaining. Prefer a standard stack (pino + OpenTelemetry) over hand-rolled loggers; write a small wrapper like this lesson's only to understand what those tools do or in a tiny service.

## Working with AI

Ask for "pino with a child logger per request (requestId), redaction of `password`, `token` and `authorization`, and an access log line with method, route, status and duration". Review generated code for:

- `console.log` with string concatenation instead of structured fields.
- Secrets, tokens or whole request bodies in logs.
- No request id, or one generated but never returned or propagated.
- Averages instead of percentiles on dashboards.
- High-cardinality metric labels (raw paths, user ids).
- Errors logged without their stack, or logged and swallowed.
