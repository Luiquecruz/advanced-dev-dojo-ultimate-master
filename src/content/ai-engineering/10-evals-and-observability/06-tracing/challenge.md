Build a minimal tracer for model features: spans with parent and child ids, wrappers that trace model and tool calls with OpenTelemetry GenAI attribute names, content left out unless opted in, and a token and cost rollup per trace.

## 1. `createTracer({ now = Date.now, captureContent = false, newId })`

`newId(bytes)` returns `bytes` random bytes as lowercase hex (default: `randomBytes(bytes).toString('hex')` from `node:crypto`). Return `{ captureContent, spans, startSpan(name, { parent?, kind = 'internal', attributes = {} }) }`.

`startSpan` returns a span `{ traceId, spanId, parentSpanId, name, kind, startMs, endMs, status, attributes, setAttribute(key, value), end(status?) }`:

- a root span (no `parent`) gets a new `traceId` from `newId(16)`; a child copies its parent's `traceId` and sets `parentSpanId` to the parent's `spanId` (`null` for a root); every span gets `spanId = newId(8)`;
- `startMs` is `now()`, `endMs` is `null` and `status` is `'unset'` until the span ends; `attributes` starts as a copy of the given attributes;
- `end(status?)` sets `endMs = now()`, sets `status` when given, and appends the span to `tracer.spans`; ending a span again does nothing.

## 2. `tracedModel(model, tracer, { provider, parent? })`

Return `{ name: model.name, generate(request) }`. Each call starts a child of `parent` named `chat <requestModel>` with kind `'client'`, where `requestModel` is `request.model ?? model.name`, and attributes:

- `gen_ai.operation.name: 'chat'`, `gen_ai.provider.name: provider`, `gen_ai.request.model: requestModel`;
- `gen_ai.request.max_tokens` and `gen_ai.request.temperature` only when the request sets them;
- on success: `gen_ai.response.id`, `gen_ai.response.model`, `gen_ai.response.finish_reasons` (an array with the finish reason), `gen_ai.usage.input_tokens`, `gen_ai.usage.output_tokens`; then `end('ok')` and return the response;
- on failure: `error.type` (the error's string `code`, otherwise its `name`), `end('error')`, and rethrow the same error.

Only when `tracer.captureContent` is `true`: `gen_ai.input.messages` = `JSON.stringify(request.messages)` and, on success, `gen_ai.output.messages` = `JSON.stringify([{ role: 'assistant', content: text, toolCalls }])`.

## 3. `tracedTool(tool, tracer, { parent? })`

A tool is `{ name, description, execute(args, callId?) }`. Return the tool with an `execute(args, callId?)` that starts a child of `parent` named `execute_tool <name>` (kind `'internal'`) with `gen_ai.operation.name: 'execute_tool'`, `gen_ai.tool.name`, `gen_ai.tool.description` and, when `callId` is given, `gen_ai.tool.call.id`; runs the tool; ends `'ok'` and returns its result, or sets `error.type`, ends `'error'` and rethrows. Only with content capture: `gen_ai.tool.call.arguments` = `JSON.stringify(args)` and `gen_ai.tool.call.result` (a string result as is, anything else as JSON).

## 4. `summarizeTrace(spans, traceId, pricing)`

`pricing` maps a model name to `{ inputPerMillion, outputPerMillion }`. Over the spans of that trace only, return `{ traceId, spans, modelCalls, toolCalls, errors, inputTokens, outputTokens, costUsd, durationMs, unpricedModels }`:

- `modelCalls` and `toolCalls` count spans by `gen_ai.operation.name` (`chat`, `execute_tool`); `errors` counts spans with status `'error'`;
- tokens sum the usage attributes of the model spans (a failed call has none);
- `costUsd` prices each model span by `gen_ai.response.model` (or `gen_ai.request.model` when the call failed); a model missing from `pricing` adds nothing and appears once in `unpricedModels`;
- `durationMs` is the latest `endMs` minus the earliest `startMs`.

The tests inject the clock and ids, script failures and seeded replies containing personal data, and check names, ids, attributes and sums.
