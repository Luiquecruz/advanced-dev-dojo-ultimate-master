Make model calls resilient in three layers: retries for transient errors, a fallback to a second provider when retries run out, and cheap-first routing that escalates to a stronger model only when the cheap answer fails validation. Waiting and randomness are injected, so the tests never wait.

Models are passed in as parameters. Each has a `name` and `await model.generate(request)`; the tests create them with `create_model("cheap")`, `"strong"`, `"primary"` and `"backup"`. Failed calls raise a `ModelError` (from `dojo_ai`) with a `status`, a `code` and, sometimes, `retry_after_ms`.

Retry options are a `RetryOptions` dataclass (already written) with `retries`, `base_ms`, `max_ms`, `sleep` and `random`: `await sleep(ms)` waits (default: `asyncio.sleep`) and `random()` returns a number in `[0, 1)` (default: `random.random`). Responses are dicts, like `{"text": ..., "usage": ...}`.

## 1. `is_retryable(error)`

`True` for a `ModelError` with status `429`, `500`, `503`, `504` or `529` (an overload status some providers use). `False` for everything else, including a `400` with code `context_length`, a `401` and exceptions that are not model errors.

## 2. `retry_delay(attempt, error, options)`

When the error has a `retry_after_ms` (not `None`), return it unchanged. Otherwise return full jitter: `random() × min(max_ms, base_ms × 2^attempt)`. `attempt` starts at `0`.

## 3. `generate_with_retry(model, request, options)`

Await `model.generate(request)` and return the first successful response. When a call fails with a retryable error and fewer than `retries` retries have happened, `await options.sleep(retry_delay(attempt, error, options))` and call again. Otherwise raise that last error. `retries=3` means at most 4 calls.

## 4. `generate_with_fallback(primary, backup, request, options)`

Run `generate_with_retry` on `primary`. If it ultimately fails with a retryable error, run `generate_with_retry` on `backup` (no extra sleep before switching). A non-retryable error is raised immediately, without a fallback. Returns `{"response": ..., "model": ...}`, where `"model"` is the `name` of the model that answered.

## 5. `InvalidAnswerError` and `answer(request, options)`

`options` is a `RouterOptions`: the retry options plus `models` (a dict with `"cheap"`, `"strong"` and `"backup"`) and `validate(text)`, which returns `True` for a usable answer.

1. Call `generate_with_retry` on the cheap model. If it succeeds and `validate` accepts the text, return `{"text": ..., "model": cheap.name, "escalated": False}`.
2. Otherwise (the cheap call failed for any reason, or its answer was rejected), call `generate_with_fallback` with the strong model as primary and the backup as backup.
3. If `validate` accepts that text, return `{"text": ..., "model": ..., "escalated": True}` with the name of the model that answered; otherwise raise an `InvalidAnswerError`.

The tests script failure orders, outages per model and every malformed answer shape across seeds; they check calls, delays and which model answered, never the wording.
