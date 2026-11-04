Give the agent loop limits. `run_budgeted_agent` runs the same loop as the previous lesson (call, append the assistant turn, execute tool calls, append tool results) but stops on any exhausted budget and returns **why** it stopped in a structured form.

`execute_tool_call(tools, call)` from the previous lesson is already written in the starter. Tools are dicts `{"name", "description", "parameters", "execute"}`; the model is anything with `await model.generate(request)`. Each response carries `"usage": {"inputTokens", "outputTokens", "totalTokens", "cost"}`, with `"cost"` in US dollars. Dicts keep camelCase keys; functions and parameters use Python names.

## 1. `call_signature(call)`

Return a string that identifies a tool call `{"name", "arguments"}` (`"arguments"` is the raw JSON string): two calls get the same signature exactly when they have the same name and the same arguments, **regardless of key order** at any depth. When the arguments do not parse, use the raw text.

## 2. `run_budgeted_agent(model, task, tools, budget, now=system_clock, repeat_limit=3)`

- `budget`: a dict `{"maxSteps", "maxTokens", "maxCostUsd", "maxDurationMs"}`; only `"maxSteps"` is required, and an omitted limit is not checked.
- `now()`: returns the current time in milliseconds (the starter's `system_clock` by default). Read it once at the start; elapsed time is `now()` minus that start.

The conversation starts with `{"role": "user", "content": task}`, and every call passes the tool definitions `{"name", "description", "parameters"}`. The checks happen in this order:

1. **Before each model call:** if `"maxSteps"` calls were already made, stop with `max_steps`. If the elapsed time is at or above `"maxDurationMs"`, stop with `timeout`. No call starts after a limit is hit.
2. **After each call:** add its usage to the totals and append the assistant turn. Then:
   - finish reason `refusal` or `content_filter`: stop with `refused`;
   - no tool calls: stop with `done` and the reply text as the answer (an answer that arrives is returned even if it pushed a total over a budget);
   - total tokens at or above `"maxTokens"`: stop with `max_tokens`;
   - total cost at or above `"maxCostUsd"`: stop with `max_cost`.
   In the last two cases, do **not** execute the tool calls of that response.
3. **For each tool call, in order:** compare its signature with the previous tool call's signature (across responses). When the same signature has now been requested `repeat_limit` times in a row, stop with `stuck` without executing it. Otherwise execute it and append its tool message.

Return `{"stop", "answer", "usage", "elapsedMs", "messages"}`:

- `"stop"`: `{"reason", "detail"}`, where `"reason"` is one of `"done"`, `"refused"`, `"max_steps"`, `"max_tokens"`, `"max_cost"`, `"timeout"`, `"stuck"`, and `"detail"` is a non-empty human-readable explanation (for example, which limit and the value reached).
- `"answer"`: the final text for `done`, otherwise `None`.
- `"usage"`: `{"steps", "inputTokens", "outputTokens", "totalTokens", "costUsd"}`, the number of model calls and the sums of every response's usage.
- `"elapsedMs"`: elapsed time when the run stopped.

The tests inject the clock, configure prices on the fake model, script models that loop forever, page endlessly or repeat themselves, and run seeded mixes of behaviors to check the totals and the limits.
