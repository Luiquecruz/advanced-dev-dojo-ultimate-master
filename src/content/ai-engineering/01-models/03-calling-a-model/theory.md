# Calling a Model

Every provider API looks different on the surface and almost identical underneath. You send a list of **messages**, you get back **text** (or tool calls), a **finish reason** and a **usage** record. Code that understands those four things can talk to any model; code that only reads `response.text` breaks in ways that are hard to notice.

## The common denominator

```ts
const response = await model.generate({
  messages: [
    { role: 'system', content: 'You classify support tickets. Answer with one category.' },
    { role: 'user', content: 'My invoice shows the wrong VAT number.' },
  ],
  maxTokens: 50,
});
// { text, finishReason, usage: { inputTokens, outputTokens, totalTokens, cost } }
```

- **Messages** carry a `role`. The `system` message holds standing instructions; `user` holds the request; `assistant` holds earlier model turns; `tool` holds tool results (module 03). The model is stateless: every call resends the whole conversation.
- **`maxTokens`** caps the output. It is a safety limit on cost and latency, not a length instruction: the model does not plan to stop there, it is simply cut off.
- **Finish reason** says *why* the output ended. `stop`: the model finished. `length`: the output hit `maxTokens` or the context limit. `tool_calls`: the model wants a tool run. `refusal` or `content_filter`: the model or a safety layer declined.
- **Usage** is the provider's own count of input and output tokens. It is the only number you can bill, budget and alert on (next lesson).

## Why a thin layer of your own

Calling the SDK from twenty places works until you must change all of them. A small provider-agnostic function (`complete(model, input)`) gives you one place to:

- build messages the same way everywhere (system prompt first, then the user turn);
- map provider-specific responses into your own result type, so switching providers changes one adapter, not every caller;
- add retries, fallbacks, logging, cost tracking and tracing later (lessons 04 and 06, module 10);
- inject a fake model in tests, which is exactly how this track grades your code.

Keep it thin: a stable contract, not a framework that hides what the model returned.

## Finish reasons are outcomes, not details

The most common bug in model integrations is treating every response as a complete answer.

```ts
const { text, finishReason } = await model.generate(request);
if (finishReason === 'length') {
  // text is a prefix: a JSON object missing its closing brace, a summary cut mid-sentence
}
```

A truncated answer looks plausible. Truncated JSON fails to parse three steps later, far from the cause; a truncated summary silently drops the conclusion. A refusal is a different outcome again: retrying the same prompt rarely helps, and showing "I can't help with that" as if it were the answer confuses users. Your wrapper should return a **status** the caller cannot ignore, such as `complete`, `truncated` or `refused`, and keep the partial text and usage so the caller can decide: raise `maxTokens`, ask the model to continue, rephrase, or show a fallback.

Errors are not finish reasons. Rate limits, overloads and an oversized input arrive as exceptions with a status code; let them reach the caller (or a retry layer) unchanged instead of turning them into an empty string.

## Streaming

`model.stream(request)` yields the same answer in pieces: text **deltas** as they are generated, then a final event with the finish reason and usage.

```ts
for await (const chunk of model.stream(request)) {
  if (chunk.type === 'text') process.stdout.write(chunk.delta);
  if (chunk.type === 'finish') console.log(chunk.finishReason, chunk.usage);
}
```

Streaming does not make the model faster; it lowers **time to first token**, which is what users perceive in a chat UI. The cost is complexity: usage arrives only at the end, a stream can fail halfway, and a truncated stream is only detectable from the final event. A streaming variant of your wrapper should concatenate the deltas, forward each one to the UI, and return the same result shape as the non-streaming call.

## Pitfalls

- Reading `text` and ignoring `finishReason`.
- Swallowing errors and returning `''`, which turns an outage into wrong answers.
- Setting `maxTokens` so low that normal answers are truncated, or not setting it at all.
- Leaking raw SDK types through the whole codebase.
- Estimating usage yourself after the call instead of reading what the provider reports.

Major providers expose the same ingredients under different names: role-based messages, a finish or stop reason, token usage and streamed events. Gateway libraries normalize those field names, and many providers offer a compatible endpoint, so a thin adapter of your own keeps the rest of the application independent of any one shape.

## When to choose it

Wrap model calls in your own small function as soon as more than one place in the code calls a model, or as soon as you want tests that do not hit a real API. Use the provider SDK directly for a one-off script or a prototype you will throw away. Prefer an existing gateway library over a home-grown one when you need many providers and features (tools, structured output, streaming UIs) quickly, but still keep a thin seam of your own around it so the library can be replaced. Stream when a human watches the answer appear; skip streaming for background jobs, where it only adds failure modes.
