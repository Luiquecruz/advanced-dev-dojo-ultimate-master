# Function Calling

A model can only produce text. **Function calling** (also called *tool use*) is the convention that lets that text act on the world: you describe tools to the model, the model answers with a structured request to call one, **your application executes it**, and the result goes back into the conversation as context. The model never runs anything. Every side effect, permission check and failure happens in your code.

## The round trip

```text
you   -> model: messages + tool definitions (name, description, JSON Schema parameters)
model -> you:   finishReason 'tool_calls', toolCalls: [{ id, name, arguments: '{"orderId":"A-1001"}' }]
you:            parse the arguments, run get_order, capture the result or the error
you   -> model: messages + assistant message (with toolCalls) + one tool message per call (toolCallId)
model -> you:   a text answer, or more tool calls
```

Three details make or break the loop:

1. **The assistant message goes back too.** Providers expect the transcript to contain the assistant turn that requested the tools, followed by one `tool` message per call. Drop the assistant turn and the next request is rejected or misread.
2. **Ids pair calls with results.** Each tool message carries the `toolCallId` of the call it answers. With parallel calls (several in one response) the ids are the only reliable link.
3. **Arguments arrive as a string.** They are model output, so they can be broken JSON, a JSON array, missing fields or values of the wrong type. Parse and validate them like any untrusted input.

```ts
const response = await model.generate({ messages, tools: definitions });
if (response.toolCalls.length > 0) {
  messages.push({ role: 'assistant', content: response.text, toolCalls: response.toolCalls });
  for (const call of response.toolCalls) {
    messages.push(await executeToolCall(call, tools));
  }
}
```

## Errors are messages, not exceptions

When the model calls a tool that does not exist, sends arguments that do not parse, or the tool itself fails, throwing aborts the whole conversation for a problem the model could often fix. Instead, answer the call with a **tool message that explains the error** in words the model can act on:

```json
{ "error": "Unknown tool \"cancel_order\". Available tools: get_order, get_refund_policy." }
```

Listing the available tools, naming the invalid field, or saying "call it again with a JSON object" turns most failures into one extra round instead of a crash. Keep exceptions for problems the model cannot fix: the model API is down, the user is not authorized, the budget is spent.

## Bound the loop

A model that keeps calling tools (because a result never satisfies it, or because two tools feed each other) burns tokens and money until something stops it. Every tool loop needs a **maximum number of rounds**, and reaching it is an error the caller handles explicitly (escalate to a human, return a partial answer), not a silent truncation. Module 07 adds budgets for tokens, cost and time; the round limit is the first and cheapest guard.

## Tool choice and parallel calls

Most APIs accept a **tool choice** setting: let the model decide (`auto`), force a tool call (`required` or a named tool), or forbid tools (`none`). Forcing a specific tool is a reliable way to get structured output from models that are better at tool calls than at free JSON. Models can also return **several calls at once** when they are independent ("look up the order *and* the refund policy"); execute them all and return every result before calling the model again. Run them concurrently only when they have no side effects on each other.

## Pitfalls

- Executing tool calls without validating the arguments, or trusting the model to respect the schema.
- Forgetting the assistant message, or mismatching `toolCallId`s when there are parallel calls.
- Throwing on the first malformed call instead of letting the model correct itself.
- No round limit, or a limit that silently returns whatever the last message was.
- Giving the model a tool that mutates data (refunds, deletes) without a confirmation step in your code. The model proposes; your application decides.

> **Status as of October 2026:** every major model API supports function calling with JSON Schema parameters, parallel calls and a tool choice setting, and most offer a "strict" mode that constrains arguments to the schema. Field names differ (`tool_use` blocks, `function_call` items, `tool_calls` arrays), which is why this track wraps them behind one provider-agnostic shape. Strict modes reduce malformed arguments but do not remove the need to validate values against your business rules.

## When to choose it

Use function calling whenever a model needs fresh data (an order status, today's price) or must trigger an action, and the set of tools is known by your application. Prefer a plain code path when the decision is deterministic: if every request needs the same lookup, fetch it yourself and put the result in the prompt, which is cheaper and faster than letting the model ask for it. When the same tools must be shared by several applications or agents, expose them over MCP (lessons 04–06) instead of redefining them in each one.
