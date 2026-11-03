Start with `executeToolCall`, because the loop is easy once a tool call can never throw. Three early returns in order: find the tool by name (or return an `Error:` listing `tools.map((tool) => tool.name)`), parse the arguments in a `try`/`catch` and check the result is a non-null, non-array object, then `await tool.execute(args)` inside another `try`/`catch`.
---
The loop is `for (let step = 1; step <= maxSteps; step++)`. Push the assistant message right after the call, before deciding anything, so the returned conversation is complete. Check the refusal finish reasons first, then `response.toolCalls.length === 0` for the final answer.
---
For each tool call, push `{ role: 'tool', toolCallId: call.id, content: await executeToolCall(tools, call) }`. The id is what ties a result to its call; the model needs one result per call id before its next turn. When the `for` loop ends without returning, return `{ status: 'max_steps', answer: null, steps: maxSteps, messages }`.
