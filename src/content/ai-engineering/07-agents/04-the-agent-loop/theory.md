# The Agent Loop

Strip away the frameworks and an agent is a loop of about twenty lines: send the conversation and the tool list to the model, run the tools it asks for, append the results, repeat until it answers without asking for a tool. Every agent product, from a coding agent to a support bot, runs some version of it. Knowing it by heart is what lets you debug them.

## Observe, act, observe again

The research name for the pattern is **ReAct** (reason + act): the model alternates between reasoning about the task and acting through tools, and each tool result becomes a new observation it reasons about. Modern models do this natively through function calling:

1. **Observe:** the model receives the task, the conversation so far and the tool definitions.
2. **Act:** it replies with one or more tool calls (or with a final answer).
3. **Execute:** *your code* runs the calls. The model never executes anything; it proposes.
4. **Feed back:** you append the assistant turn and one tool result per call, matched by call id.
5. **Repeat** until a stop condition.

```ts
for (let step = 1; step <= maxSteps; step++) {
  const response = await model.generate({ messages, tools: definitions });
  messages.push({ role: 'assistant', content: response.text, toolCalls: response.toolCalls });
  if (response.toolCalls.length === 0) return { status: 'done', answer: response.text };
  for (const call of response.toolCalls) {
    messages.push({ role: 'tool', toolCallId: call.id, content: await executeToolCall(tools, call) });
  }
}
return { status: 'max_steps', answer: null };
```

The conversation is the agent's working memory. Each step resends all of it, which is why long runs get expensive (lesson 05) and why context engineering (module 02) matters inside loops.

## Tool calls are untrusted input

The model writes tool calls the way it writes text: usually right, sometimes not. Production loops see:

- **unknown tools:** a name you never offered, often a plausible invention (`refund_order` when you offered `get_order`);
- **invalid arguments:** text that is not JSON, JSON that is not an object, a missing required field;
- **tools that fail:** the service is down, the record does not exist.

None of these should crash the loop. Each becomes a **tool result describing the error**, sent back with the call id, so the model can correct itself on the next step:

```ts
if (!tool) return `Error: unknown tool "${call.name}". Available tools: get_order, find_orders.`;
```

This is the agent-computer interface from module 03 in action: errors written for the model, naming what went wrong and what is possible, recover far more often than a stack trace or silence. Never execute a tool whose arguments failed to parse "with defaults"; you would be acting on something the model did not ask for.

## Stopping

A loop needs explicit exits, each reported to the caller:

| Exit | Signal | Status |
| --- | --- | --- |
| Final answer | a reply with no tool calls | `done` |
| Refusal or filter | `finishReason` `refusal` or `content_filter` | `refused` |
| Step limit | `maxSteps` model calls without an answer | `max_steps` |

The step limit is the minimum budget. Lesson 05 adds tokens, cost, wall time and stuck detection; lesson 06 adds a human interrupt. A loop whose only exit is "the model decides it is done" will, sooner or later, run until something external kills it.

## Planning and reflection

Variations on the loop add explicit thinking steps: ask the model for a **plan** before acting and revisit it as results arrive; ask it to **reflect** on a failed attempt before retrying; let it keep a scratchpad or task list. Reasoning models do much of this internally, so start with the plain loop and add structure where traces show the agent getting lost. The loop's shape does not change: these are extra messages, not a new architecture.

## Pitfalls

- Letting a malformed tool call throw and kill the run.
- Dropping the assistant turn before the tool results, or mismatching call ids: providers reject the next request or the model loses track.
- Executing tools in parallel when they have side effects that depend on each other.
- No step limit, or a limit so high it never protects you.
- Returning only the final text, so callers cannot tell a real answer from a refusal or a timeout.

> **Status as of October 2026:** every major provider API supports parallel tool calls in one response and returns a stop reason that distinguishes tool use from a final answer. Agent SDKs (OpenAI Agents SDK, Claude Agent SDK, LangGraph's prebuilt agent, Pydantic AI, Mastra, smolagents) run this loop for you with a configurable turn or step limit; their defaults differ, so set one explicitly.

## When to choose it

Write your own loop when you need full control over messages, errors and stopping, or to understand what a framework does; it is short enough to own. Adopt an SDK when you also need its tracing, handoffs or hosted tools, and read its loop first. Either way, the loop is the right shape only for tasks whose steps cannot be scripted; for the rest, the workflows of lesson 03 are cheaper and easier to test.
