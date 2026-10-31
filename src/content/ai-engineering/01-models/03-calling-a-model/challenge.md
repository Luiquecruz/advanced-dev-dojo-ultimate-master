Write a thin, provider-agnostic layer over a model client. The model is passed in as a parameter (the tests pass `createModel()` from `@dojo/ai`), so the same functions work with any provider adapter and with the fake model.

The model offers two operations:

- `generate(request)` returns a response with `text`, `finishReason` and `usage` (`inputTokens`, `outputTokens`, `totalTokens`, `cost`).
- `stream(request)` yields chunks in order: `{ type: 'text', delta }` pieces, then one `{ type: 'finish', finishReason, usage }`.

A request has `messages` (each with `role` and `content`) and an optional `maxTokens`.

## 1. `complete(model, input)`

`input` has a `prompt` (text), an optional `system` (text) and an optional `maxTokens` (number).

- Build the request: when `system` is given, the first message is `{ role: 'system', content: system }`; the last message is always `{ role: 'user', content: prompt }`. Without `system` there is only the user message. Include `maxTokens` in the request only when the input has it.
- Call `generate` once and return a result with four fields:
  - `status`: `'complete'` when the finish reason is `stop`, `'truncated'` when it is `length`, `'refused'` when it is `refusal` or `content_filter`;
  - `text`: the model's text, also when it is partial or a refusal;
  - `finishReason`: the provider's finish reason, unchanged;
  - `usage`: the usage the provider reported, unchanged (do not estimate it yourself).
- Errors thrown by the model (rate limits, server errors) reach the caller unchanged.

## 2. `completeStream(model, input, onDelta)`

Same input and same request as `complete`, but call `stream` instead of `generate`.

- For every text chunk, call `onDelta(delta)` in order (the callback is optional) and append the delta to the text.
- Take `finishReason` and `usage` from the finish chunk.
- Return the same result shape as `complete`, with the full concatenated text and the same status rules.
- When the stream fails partway, fail with that error unchanged; the deltas already forwarded stay forwarded.

The tests script the fake model with normal, truncated, refused and failing replies and check the result fields, never the exact wording of a reply.
