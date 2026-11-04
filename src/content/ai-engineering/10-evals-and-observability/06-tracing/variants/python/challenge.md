Build a minimal tracer for model features: spans with parent and child ids, wrappers that trace model and tool calls with OpenTelemetry GenAI attribute names, content left out unless opted in, and a token and cost rollup per trace.

The starter already defines the `Span` dataclass (`trace_id`, `span_id`, `parent_span_id`, `name`, `kind`, `start_ms`, `end_ms`, `status`, `attributes`, plus a hidden reference to its tracer) and the `Tracer` class. Attribute keys are the OpenTelemetry strings (`"gen_ai.request.model"`); requests, responses and the summary are dicts with camelCase keys.

## 1. `create_tracer(now=current_time_ms, capture_content=False, new_id=secrets.token_hex)`

All keyword-only. `now()` returns the time in milliseconds and `new_id(size)` returns `size` random bytes as lowercase hex. Return a `Tracer` with `capture_content`, `spans` (a list) and `start_span(name, parent=None, kind="internal", attributes=None)`.

`start_span` returns a `Span`:

- a root span (no `parent`) gets a new `trace_id` from `new_id(16)`; a child copies its parent's `trace_id` and sets `parent_span_id` to the parent's `span_id` (`None` for a root); every span gets `span_id = new_id(8)`;
- `start_ms` is `now()`, `end_ms` is `None` and `status` is `"unset"` until the span ends; `attributes` starts as a copy of the given attributes;
- `span.set_attribute(key, value)` sets one attribute;
- `span.end(status=None)` sets `end_ms = now()`, sets `status` when given, and appends the span to `tracer.spans`; ending a span again does nothing.

## 2. `traced_model(model, tracer, provider=..., parent=None)`

Return an object with `name` (the model's `name`) and `async generate(request)`. Each call starts a child of `parent` named `chat <request_model>` with kind `"client"`, where `request_model` is `request["model"]` when set, otherwise `model.name`, and attributes:

- `"gen_ai.operation.name": "chat"`, `"gen_ai.provider.name": provider`, `"gen_ai.request.model": request_model`;
- `"gen_ai.request.max_tokens"` and `"gen_ai.request.temperature"` only when the request sets `"maxTokens"` and `"temperature"`;
- on success: `"gen_ai.response.id"`, `"gen_ai.response.model"`, `"gen_ai.response.finish_reasons"` (a list with the finish reason), `"gen_ai.usage.input_tokens"`, `"gen_ai.usage.output_tokens"`; then `end("ok")` and return the response;
- on failure: `"error.type"` (the error's string `code`, like `ModelError.code`, otherwise its class name), `end("error")`, and raise the same error again.

Only when `tracer.capture_content` is `True`: `"gen_ai.input.messages"` = the request messages as compact JSON (`json.dumps(value, separators=(",", ":"))`) and, on success, `"gen_ai.output.messages"` = `[{"role": "assistant", "content": text, "toolCalls": tool_calls}]` as compact JSON.

## 3. `traced_tool(tool, tracer, parent=None)`

A tool is a dict `{"name", "description", "execute"}`, where `execute(arguments, call_id=None)` is sync or `async`. Return a copy of the tool whose `"execute"` is an `async def execute(arguments, call_id=None)` that starts a child of `parent` named `execute_tool <name>` (kind `"internal"`) with `"gen_ai.operation.name": "execute_tool"`, `"gen_ai.tool.name"`, `"gen_ai.tool.description"` and, when `call_id` is given, `"gen_ai.tool.call.id"`; runs the tool with `(arguments, call_id)`; ends `"ok"` and returns its result, or sets `"error.type"`, ends `"error"` and raises again. Only with content capture: `"gen_ai.tool.call.arguments"` = the arguments as compact JSON and `"gen_ai.tool.call.result"` (a string result as is, anything else as compact JSON).

## 4. `summarize_trace(spans, trace_id, pricing)`

`pricing` maps a model name to `{"inputPerMillion", "outputPerMillion"}`. Over the spans of that trace only, return `{"traceId", "spans", "modelCalls", "toolCalls", "errors", "inputTokens", "outputTokens", "costUsd", "durationMs", "unpricedModels"}`:

- `"modelCalls"` and `"toolCalls"` count spans by `"gen_ai.operation.name"` (`chat`, `execute_tool`); `"errors"` counts spans with status `"error"`;
- tokens sum the usage attributes of the model spans (a failed call has none);
- `"costUsd"` prices each model span by `"gen_ai.response.model"` (or `"gen_ai.request.model"` when the call failed); a model missing from `pricing` adds nothing and appears once in `"unpricedModels"`;
- `"durationMs"` is the latest `end_ms` minus the earliest `start_ms`.

The tests inject the clock and ids, script failures and seeded replies containing personal data, and check names, ids, attributes and sums.
