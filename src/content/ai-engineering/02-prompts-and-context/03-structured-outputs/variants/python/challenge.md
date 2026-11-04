Turn free-text extraction into a validated structured output: describe the shape with one JSON Schema, repair what is mechanical, re-ask with the validation error when repair is not enough, and give up after a bounded number of attempts.

Python has no Zod in the standard library (in production you would reach for Pydantic or `jsonschema`), so the schema is a plain JSON Schema dict and `validation.py` (already written, read it) checks values against it:

- `safe_parse(schema, value)` returns `{"success": True, "data": ...}` with defaults applied and unknown keys dropped, or `{"success": False, "issues": [...]}`;
- `prettify_error(issues)` turns the issues into readable text that names each invalid field.

The same dict is what the model receives as its JSON Schema, so the description and the check never drift apart. Requests, responses and results are dicts with camelCase keys.

## 1. `parse_model_json(text)`

Returns `{"ok": True, "value": ..., "repaired": ...}` or `{"ok": False, "error": ...}` (an error message). Steps, stopping at the first that parses:

1. Parse the stripped text as it is (`json.loads`): success with `"repaired": False`.
2. Take the text from the first `{` to the last `}`. When there is no such pair, fail.
3. Remove trailing commas before `}` or `]` and parse: success with `"repaired": True`.
4. Replace single quotes with double quotes and parse: success with `"repaired": True`.
5. Otherwise fail with the parse error message.

Never guess missing content: a truncated object fails.

## 2. `StructuredOutputError`

An exception with `reason` (`"refusal"` or `"exhausted"`), `attempts` (number of calls made) and `last_error` (text describing the last problem). Already written.

## 3. `generate_structured(model, messages, schema, max_attempts=3)`

`schema` is a JSON Schema dict; `max_attempts` is the maximum number of model calls. Each attempt awaits `model.generate(request)` with the current conversation and `"responseFormat": {"type": "json", "schema": schema}`.

1. Finish reason `refusal` or `content_filter`: raise at once with reason `"refusal"`.
2. Finish reason `length`: the attempt fails (the reply was cut off); do not parse it.
3. Otherwise parse with `parse_model_json`, then validate with `safe_parse(schema, value)`. On success return `{"value": ..., "attempts": ..., "repaired": ...}`, where `"value"` is the **validated** data (defaults applied) and `"attempts"` counts the calls.
4. When the attempt failed and calls remain, continue the conversation with two more messages: `{"role": "assistant", "content": <the reply text>}` and a user message describing the problem. For a schema violation, include `prettify_error(issues)`, which names each invalid field. Never modify the caller's `messages` list.
5. When the last allowed attempt fails, raise with reason `"exhausted"`, `attempts` equal to `max_attempts` and the last problem as `last_error`.

Model errors (`ModelError` for rate limits and server errors) reach the caller unchanged: retries belong to another layer.

The tests run every malformed JSON shape the fake model produces across seeds, schema violations, truncation, refusals and endless failures; they check calls, messages and results, never the wording.
