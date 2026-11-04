Replace prompt spaghetti with a message builder: a structured prompt spec goes in, a list of messages with clearly separated parts comes out, and untrusted input cannot break out of its delimiters.

A **prompt spec** is a dict with camelCase keys, like the JSON it would be stored as:

- `"role"` (text, required), `"task"` (text, required), `"input"` (text, required: the data to work on);
- `"constraints"` (optional list of texts);
- `"outputFormat"` (optional): `{"type": "text" | "json", "description": ...}`;
- `"examples"` (optional list of `{"input": ..., "output": ...}`);
- `"context"` (optional text: reference material for this request).

Messages are dicts `{"role": ..., "content": ...}`.

## 1. `delimit(tag, content)`

Return `<tag>`, a newline, the content, a newline and `</tag>`. Before wrapping, replace every opening or closing tag of the **same name** inside the content (in any letter case, with optional spaces inside the angle brackets, such as `</INPUT>` or `< input >`) with `[tag]` or `[/tag]`. Other tags stay unchanged.

## 2. `PromptSpecError` and `build_messages(spec)`

Validate first. Raise a `PromptSpecError` whose `field` is `"role"`, `"task"` or `"input"` when that key is missing or blank, or `"examples"` when an example has a blank `"input"` or `"output"`.

Then return the messages in this order:

1. **One system message.** Its content is the role; then, when there are constraints, a blank line, `Constraints:` and one line `- <constraint>` per constraint; then, when there is an output format, a blank line and `Output format: <description>`. Sections are separated by one blank line (`"\n\n"`). With no constraints and no format, the content is exactly the role. The task and the input never go in the system message.
2. **One pair per example**: a user message with `delimit("input", example["input"])`, then an assistant message with `example["output"]`.
3. **One final user message** joining with `"\n\n"`: `delimit("context", context)` (only when there is a context), the task, and `delimit("input", input)`.

## 3. `PromptRunError` and `run_prompt(model, spec)`

Await `model.generate(request)` once with the messages from `build_messages(spec)`. Add `"responseFormat": {"type": "json"}` to the request only when the output format's `"type"` is `"json"`.

- When the finish reason is `stop`, return the response text.
- Otherwise (`length`, `refusal`, `content_filter`) raise a `PromptRunError` carrying `finish_reason` and the partial `text`.

The tests check message structure, delimiters and handling of every finish reason across seeds, never the wording of a reply.
