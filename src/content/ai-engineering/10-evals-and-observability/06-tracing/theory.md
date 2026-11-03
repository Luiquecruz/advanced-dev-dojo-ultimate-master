# Tracing

A customer says the support agent "took forever and then said something weird". Your logs show 40 lines from that minute, interleaved with other users' requests. Which model calls belonged to this conversation? Which tool failed? Was the slow part the model, the lookup or the retry? **Tracing** answers these questions by recording every operation of a request as a **span** in one tree.

## Traces and spans

A **trace** is one request end to end. A **span** is one operation inside it:

| Field | Meaning |
| --- | --- |
| `traceId` | shared by every span of the request (32 hex characters in W3C Trace Context) |
| `spanId` | this operation (16 hex characters) |
| `parentSpanId` | the operation that started this one; `null` for the root |
| `name`, `kind` | what it is; `client` for calls to another service, `internal` for in-process work |
| `startMs`, `endMs` | when it ran |
| `status` | `unset`, `ok` or `error` |
| `attributes` | key-value facts: model, tokens, tool name, error type |

For an agent, the tree reads like the run itself:

```
invoke_agent support                 1 240 ms
  chat atlas-mini                      380 ms  in=412 out=18
  execute_tool get_order                40 ms
  chat atlas-mini                       90 ms  error.type=overloaded
  chat atlas-mini                      610 ms  in=468 out=31
```

Parent and child ids are what make the tree. Within one process, the current span travels through the code (in Node.js, OpenTelemetry uses `AsyncLocalStorage`; this lesson passes the parent explicitly). Across services, the `traceparent` HTTP header carries the trace id and parent span id, so a call to your retrieval service joins the same trace.

## Semantic conventions: agreeing on names

If every team names attributes differently (`model`, `llm.model_name`, `modelId`), no dashboard works across services. The **OpenTelemetry GenAI semantic conventions** define the names:

| Span | Name | Key attributes |
| --- | --- | --- |
| Model call | `chat {model}` | `gen_ai.operation.name` = `chat`, `gen_ai.provider.name`, `gen_ai.request.model`, `gen_ai.response.model`, `gen_ai.response.id`, `gen_ai.response.finish_reasons`, `gen_ai.usage.input_tokens`, `gen_ai.usage.output_tokens`, `gen_ai.request.max_tokens`, `gen_ai.request.temperature` |
| Tool call | `execute_tool {tool}` | `gen_ai.operation.name` = `execute_tool`, `gen_ai.tool.name`, `gen_ai.tool.call.id`, `gen_ai.tool.description` |
| Agent run | `invoke_agent {agent}` | `gen_ai.operation.name` = `invoke_agent`, `gen_ai.agent.name` |
| Any failure | | `error.type` (an error code or class) and status `error` |

Record both the requested and the responded model: an alias such as `-latest` resolves to a dated snapshot, and only the response says which one actually answered (Snapshot pinning, module 01). The finish reasons show truncation and refusals at a glance.

## Tokens and cost

Token counts belong on the spans because the provider reports them per call. **Cost does not**: prices change, differ per contract and per cache hit, and the conventions define no cost attribute. Compute cost at query time from the token attributes and a price table you own, and roll it up per trace, per feature and per customer. A rollup per trace answers "what did this conversation cost?"; per-feature rollups feed budgets (module 13).

## Content: off by default

Prompts, outputs, tool arguments and tool results contain exactly what you must not leak: personal data, secrets, documents a user may not share. The conventions treat them as **opt-in**: instrumentations should not capture `gen_ai.input.messages`, `gen_ai.output.messages`, `gen_ai.system_instructions`, `gen_ai.tool.call.arguments` or `gen_ai.tool.call.result` unless configured to. Practical patterns:

- **Default:** structure only (models, tokens, timings, tool names, errors). Enough for latency, cost and error dashboards.
- **Pre-production:** capture content on spans, in storage that complies with your data rules.
- **Production:** store content separately with its own access control and retention, and put only a reference on the span; or capture a sampled, redacted subset for review.

## Spans and retries

When a client library retries automatically, the conventions ask for one span covering the logical operation with all its retries. When your agent retries explicitly (as in this lesson's demo), each attempt is its own span, which makes flaky providers visible.

## Pitfalls

- Logs without trace ids, so a request cannot be reassembled.
- Custom attribute names that no backend or teammate recognizes.
- Logging full prompts and outputs with personal data in plain text.
- Storing a computed cost as truth on the span, so a price correction rewrites nothing.
- Spans that never end on errors, so failed calls vanish from the trace.

> **Status as of October 2026:** the GenAI semantic conventions are in **Development** status and moved in 2026 to their own repository (`open-telemetry/semantic-conventions-genai`); `gen_ai.system` was replaced by `gen_ai.provider.name`. Content capture is controlled by `OTEL_INSTRUMENTATION_GENAI_CAPTURE_CONTENT` (default `NO_CONTENT`). Langfuse, Arize Phoenix (OpenInference conventions), LangSmith, Braintrust and general APM tools (Datadog, Grafana, Honeycomb) ingest OpenTelemetry traces; OpenLLMetry and the official OpenTelemetry instrumentations cover the major model SDKs.

## When to choose it

Trace every production model feature from day one: structure-only spans are cheap, and you cannot add traces to a request that already failed. Use the semantic conventions instead of your own names, so any backend can read your data and you can switch backends later. Turn on content capture only where storage, access and retention meet your data rules; for most production systems that means references or sampled, redacted content, never full prompts by default.
