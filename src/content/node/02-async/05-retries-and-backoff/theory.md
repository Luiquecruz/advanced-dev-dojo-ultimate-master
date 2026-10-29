# Retries and Backoff

Networks fail in boring, temporary ways: a dropped connection, a deploy restarting the other service, a `503` while it scales up, a `429` because you were briefly too fast. Many of those failures disappear if you simply try again a moment later. A good retry policy turns them into small delays instead of errors; a bad one turns a short outage into a self-inflicted denial of service.

## What is worth retrying

Retry only failures that are **transient** and operations that are **safe to repeat**.

| Failure | Retry? | Why |
| --- | --- | --- |
| Network error (`fetch` rejects with `TypeError`, `ECONNRESET`) | Yes | The request may not have arrived |
| `408 Request Timeout`, `429 Too Many Requests` | Yes | Explicitly "try later" (respect `Retry-After`) |
| `500`, `502`, `503`, `504` | Yes | Server or gateway trouble, often temporary |
| `400`, `401`, `403`, `404`, `409`, `422` | No | The same request will fail the same way |
| Your own bug (`TypeError` in your code, validation) | No | Retrying only wastes time |

**Idempotency** is the other half. `GET`, `PUT` and `DELETE` are idempotent by definition: repeating them has the same effect as doing them once. A `POST /payments` that timed out may have succeeded; retrying it can charge twice. APIs such as Stripe accept an **idempotency key** header so the server can recognize a repeated request.

## Exponential backoff

Retrying immediately hits the struggling service again while it is still down. Waiting a fixed second is better, but exponential growth adapts to longer outages:

```ts
const delay = Math.min(maxMs, baseMs * 2 ** attempt);
```

With `baseMs = 100`: 100, 200, 400, 800 ms... capped at `maxMs` so the wait never becomes absurd. Combined with a maximum number of attempts, the total time is bounded.

## Jitter: avoid the thundering herd

If a thousand clients fail at the same moment and all wait exactly 200 ms, they all retry at the same moment, and the recovering server falls over again. **Jitter** randomizes each delay. The simplest effective variant, *full jitter*, picks a random delay between zero and the exponential value:

```ts
const delay = Math.random() * Math.min(maxMs, baseMs * 2 ** attempt);
```

AWS's analysis of jitter strategies found full jitter among the best at spreading load while keeping completion time low.

## Designing a retry helper

```ts
const user = await retry((attempt) => fetchUser(id), {
  retries: 3,
  baseMs: 100,
  maxMs: 2000,
  shouldRetry: isRetryable,
});
```

Decisions a helper must make explicit:

- **Attempts**: `retries: 3` means up to 4 calls. Every layer that retries multiplies the others: 3 retries in the client, the gateway and the service is 64 calls per user action.
- **Which errors**: a predicate (`shouldRetry`) instead of retrying everything.
- **Which error to report**: the last one, so logs show the final state.
- **Time and randomness as parameters**: injecting `sleep` and `random` makes the policy testable without real waiting, the same idea as injecting a clock.
- **Deadline and cancellation**: retries must stop when the caller's `AbortSignal` aborts or the overall budget runs out.
- **Server hints**: a `Retry-After` header on `429`/`503` overrides your computed delay.

## Beyond a loop

A retry loop helps with blips. When a dependency is down for minutes, every request still waits through all its attempts. A **circuit breaker** stops calling a dependency that keeps failing and fails fast for a while (libraries: `opossum`, `cockatiel`). For work that must eventually happen (send an email, sync an order), put it on a **queue** with retries spread over minutes or hours; the scaling module covers job queues.

## Libraries

`p-retry` (retry with backoff for async functions), `cockatiel` (retry, circuit breaker, timeout, bulkhead as composable policies), and built-in retry options in SDKs (AWS SDK, Google Cloud clients, many database drivers). Check what your client already does before adding another layer.

## When to choose it

Retry idempotent calls to other services on network errors, `408`, `429` and `5xx`, with exponential backoff, full jitter, a small attempt limit and an overall deadline. Do not retry client errors, validation failures or non-idempotent writes without an idempotency key. For long outages, add a circuit breaker; for work that must not be lost, use a durable queue instead of retrying inside the request.

## Working with AI

Ask for "retry with exponential backoff and full jitter, max 3 retries, only for network errors, 408, 429 and 5xx, respecting `Retry-After`". When reviewing generated code, check:

- A maximum number of attempts and a cap on the delay exist.
- Delays are randomized (jitter), not fixed or purely exponential.
- `4xx` errors and programming errors are not retried.
- `POST` requests are retried only with an idempotency key.
- Retries do not stack across layers (SDK retries plus your own loop).
- The last error is rethrown with context, and attempts are logged.
