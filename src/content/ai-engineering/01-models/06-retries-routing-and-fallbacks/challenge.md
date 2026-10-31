Make model calls resilient in three layers: retries for transient errors, a fallback to a second provider when retries run out, and cheap-first routing that escalates to a stronger model only when the cheap answer fails validation. Waiting and randomness are injected, so the tests never wait.

Models are passed in as parameters. Each has a `name` and `generate(request)`; the tests create them with `createModel({ model: 'cheap' })`, `'strong'`, `'primary'` and `'backup'`. Failed calls throw a `ModelError` (from `@dojo/ai`) with a `status`, a `code` and, sometimes, `retryAfterMs`.

Retry options are `{ retries, baseMs, maxMs, sleep, random }`: `sleep(ms)` waits (default: a real timer) and `random()` returns a number in `[0, 1)` (default: the system random).

## 1. `isRetryable(error)`

`true` for a `ModelError` with status `429`, `500`, `503`, `504` or `529` (an overload status some providers use). `false` for everything else, including a `400` with code `context_length`, a `401` and errors that are not model errors.

## 2. `retryDelay(attempt, error, options)`

When the error has `retryAfterMs`, return it unchanged. Otherwise return full jitter: `random() × min(maxMs, baseMs × 2^attempt)`. `attempt` starts at `0`.

## 3. `generateWithRetry(model, request, options)`

Call `model.generate(request)` and return the first successful response. When a call fails with a retryable error and fewer than `retries` retries have happened, `sleep(retryDelay(attempt, error, options))` and call again. Otherwise fail with that last error. `retries: 3` means at most 4 calls.

## 4. `generateWithFallback(primary, backup, request, options)`

Run `generateWithRetry` on `primary`. If it ultimately fails with a retryable error, run `generateWithRetry` on `backup` (no extra sleep before switching). A non-retryable error fails immediately, without a fallback. Returns `{ response, model }`, where `model` is the `name` of the model that answered.

## 5. `InvalidAnswerError` and `answer(request, options)`

`options` holds the retry options plus `models: { cheap, strong, backup }` and `validate(text)`, which returns `true` for a usable answer.

1. Call `generateWithRetry` on `cheap`. If it succeeds and `validate` accepts the text, return `{ text, model: cheap.name, escalated: false }`.
2. Otherwise (the cheap call failed for any reason, or its answer was rejected), call `generateWithFallback` with `strong` as primary and `backup` as backup.
3. If `validate` accepts that text, return `{ text, model, escalated: true }` with the name of the model that answered; otherwise fail with an `InvalidAnswerError`.

The tests script failure orders, outages per model and every malformed answer shape across seeds; they check calls, delays and which model answered, never the wording.
