Turn free-text extraction into a validated structured output: describe the shape with a Zod schema, repair what is mechanical, re-ask with the validation error when repair is not enough, and give up after a bounded number of attempts. `zod` (version 4) is installed.

## 1. `parseModelJson(text)`

Returns `{ ok: true, value, repaired }` or `{ ok: false, error }` (an error message). Steps, stopping at the first that parses:

1. Parse the trimmed text as it is: success with `repaired: false`.
2. Take the text from the first `{` to the last `}`. When there is no such pair, fail.
3. Remove trailing commas before `}` or `]` and parse: success with `repaired: true`.
4. Replace single quotes with double quotes and parse: success with `repaired: true`.
5. Otherwise fail with the parse error message.

Never guess missing content: a truncated object fails.

## 2. `StructuredOutputError`

An error with `reason` (`'refusal'` or `'exhausted'`), `attempts` (number of calls made) and `lastError` (text describing the last problem).

## 3. `generateStructured(model, { messages, schema, maxAttempts })`

`schema` is a Zod schema; `maxAttempts` (default `3`) is the maximum number of model calls. Each attempt calls `model.generate` with the current conversation and `responseFormat: { type: 'json', schema: z.toJSONSchema(schema) }`.

1. Finish reason `refusal` or `content_filter`: fail at once with `reason: 'refusal'`.
2. Finish reason `length`: the attempt fails (the reply was cut off); do not parse it.
3. Otherwise parse with `parseModelJson`, then validate with `schema.safeParse`. On success return `{ value, attempts, repaired }`, where `value` is the **validated** data (defaults applied) and `attempts` counts the calls.
4. When the attempt failed and calls remain, continue the conversation with two more messages: `{ role: 'assistant', content: <the reply text> }` and a user message describing the problem. For a schema violation, include `z.prettifyError(error)`, which names each invalid field. Never modify the caller's `messages` array.
5. When the last allowed attempt fails, fail with `reason: 'exhausted'`, `attempts: maxAttempts` and the last problem as `lastError`.

Model errors (rate limits, server errors) reach the caller unchanged: retries belong to another layer.

The tests run every malformed JSON shape the fake model produces across seeds, schema violations, truncation, refusals and endless failures; they check calls, messages and results, never the wording.
