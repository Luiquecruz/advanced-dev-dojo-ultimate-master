`isRetryable` has two branches: `error instanceof HttpError` (check `status` against a `Set` of retryable codes) and `error instanceof TypeError`. `backoffDelay` is one expression: the exponential value, `Math.min` with the cap, times `random()`.
---
Destructure the options with defaults: `const { retries, baseMs, maxMs, sleep = wait, random = Math.random, shouldRetry = isRetryable } = options;`. Then loop over attempts and `try { return await fn(attempt); } catch (error) { ... }`. The `await` matters: without it, a rejection escapes the `try`.
---
In the `catch`: if `attempt >= retries || !shouldRetry(error)`, `throw error`; otherwise `await sleep(backoffDelay(attempt, baseMs, maxMs, random))` and let the loop continue with `attempt + 1`.
