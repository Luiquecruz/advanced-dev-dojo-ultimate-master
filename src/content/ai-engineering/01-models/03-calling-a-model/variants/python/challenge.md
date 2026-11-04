Write a thin, provider-agnostic layer over a model client. The model is passed in as a parameter (the tests pass `create_model()` from `dojo_ai`), so the same functions work with any provider adapter and with the fake model.

The model offers two operations:

- `await model.generate(request)` returns a response dict with `"text"`, `"finishReason"` and `"usage"` (`"inputTokens"`, `"outputTokens"`, `"totalTokens"`, `"cost"`).
- `model.stream(request)` is an async iterator of chunk dicts, in order: `{"type": "text", "delta": ...}` pieces, then one `{"type": "finish", "finishReason": ..., "usage": ...}`.

A request is a dict with `"messages"` (each with `"role"` and `"content"`) and an optional `"maxTokens"`. Keys keep the provider's JSON names (camelCase); functions use Python names (snake_case).

## 1. `complete(model, input)`

`input` is a dict with `"prompt"` (text), an optional `"system"` (text) and an optional `"maxTokens"` (number).

- Build the request: when `"system"` is given, the first message is `{"role": "system", "content": system}`; the last message is always `{"role": "user", "content": prompt}`. Without `"system"` there is only the user message. Include `"maxTokens"` in the request only when the input has it.
- Await `generate` once and return a dict with four keys:
  - `"status"`: `"complete"` when the finish reason is `stop`, `"truncated"` when it is `length`, `"refused"` when it is `refusal` or `content_filter`;
  - `"text"`: the model's text, also when it is partial or a refusal;
  - `"finishReason"`: the provider's finish reason, unchanged;
  - `"usage"`: the usage the provider reported, unchanged (do not estimate it yourself).
- Errors raised by the model (`ModelError` for rate limits and server errors) reach the caller unchanged.

## 2. `complete_stream(model, input, on_delta=None)`

Same input and same request as `complete`, but iterate `model.stream(request)` with `async for` instead of calling `generate`.

- For every text chunk, call `on_delta(delta)` in order (the callback is optional) and append the delta to the text.
- Take `"finishReason"` and `"usage"` from the finish chunk.
- Return the same dict as `complete`, with the full concatenated text and the same status rules.
- When the stream fails partway, let that error propagate unchanged; the deltas already forwarded stay forwarded.

The tests script the fake model with normal, truncated, refused and failing replies and check the result fields, never the exact wording of a reply.
