Write a retry policy for calls to other services: exponential backoff with full jitter, a retry limit and a predicate for which errors are worth retrying. Time and randomness are injected, so the tests never wait.

1. `isRetryable(error)` returns `true` for an `HttpError` whose `status` is `408`, `429`, `500`, `502`, `503` or `504`, and for a `TypeError` (what `fetch` throws on a network failure). Everything else returns `false` (`400`, `401`, `403`, `404`, `409`, `422`, plain `Error`).
2. `backoffDelay(attempt, baseMs, maxMs, random = Math.random)` returns `random() * Math.min(maxMs, baseMs * 2 ** attempt)`. With `baseMs = 100`, `maxMs = 1000` and `random = () => 1`: `100, 200, 400, 800, 1000, 1000` for attempts `0` to `5`. Do not round.
3. `retry(fn, options)` with `options = { retries, baseMs, maxMs, sleep?, random?, shouldRetry? }`:
   - calls `fn(attempt)` with `attempt` starting at `0`, and resolves with the first successful result;
   - when `fn` rejects and `shouldRetry(error)` is `true` (default: `isRetryable`) and fewer than `retries` retries happened, it awaits `sleep(backoffDelay(attempt, baseMs, maxMs, random))` and calls `fn(attempt + 1)`;
   - otherwise it rejects with **that last error** (the same object);
   - `retries: 3` means at most 4 calls and 3 sleeps; a success on the first call never sleeps;
   - defaults: `sleep` waits with `setTimeout` (the `wait` helper), `random` is `Math.random`.
