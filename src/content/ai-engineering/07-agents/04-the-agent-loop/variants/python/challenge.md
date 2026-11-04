Build the loop at the heart of every agent: call the model with the conversation and the tools, run the tool calls it asks for, append the results, and call it again until it answers without tools.

Tools are plain dicts `{"name", "description", "parameters", "execute"}`. `"parameters"` is a JSON Schema dict; `"execute"` is a function that receives the parsed arguments dict and returns a value (or a coroutine to await), or raises. The model is anything with `await model.generate(request)`; the tests pass `create_model()` from `dojo_ai`. Messages and responses are dicts with the provider's camelCase keys (`"toolCalls"`, `"toolCallId"`, `"finishReason"`).

## 1. `execute_tool_call(tools, call)`

`call` is a tool call from a response: `{"id", "name", "arguments"}`, where `"arguments"` is the **raw JSON string** the model produced. Return the text of the tool result. This coroutine never raises:

- unknown tool name: return a string starting with `Error:` that names the tool and lists the available tool names;
- `"arguments"` that do not parse, or parse to something other than a JSON object (a dict): return a string starting with `Error:` and do not run the tool;
- `execute` raises: return `Error:` followed by the error message;
- otherwise return the result: a string as is, anything else as `json.dumps(result)`.

## 2. `run_agent(model, task, tools, max_steps, system=None)`

1. Start the conversation with `{"role": "system", "content": system}` when `system` is given, then `{"role": "user", "content": task}`.
2. Each step awaits `model.generate({"messages": messages, "tools": definitions})`, where `definitions` are `{"name", "description", "parameters"}` of every tool, and appends the reply as `{"role": "assistant", "content": text, "toolCalls": tool_calls}`.
3. If the reply's `"finishReason"` is `"refusal"` or `"content_filter"`, stop with status `"refused"`.
4. If the reply has no tool calls, stop with status `"done"`; its text is the answer.
5. Otherwise run every tool call in order with `execute_tool_call` and append one `{"role": "tool", "toolCallId": call["id"], "content": content}` message per call, then take the next step.
6. After `max_steps` model calls without a final answer, stop with status `"max_steps"`.

Return `{"status", "answer", "steps", "messages"}`: `"answer"` is the final text for `"done"` and `None` otherwise, `"steps"` is the number of model calls made, and `"messages"` is the whole conversation including the last assistant turn.

The tests script tool calls, broken arguments, unknown tools, failing tools, refusals and models that never stop, and react to your tool results with `fake_model.handle`. They check the messages you send and the status you return, never the wording of your error texts beyond the `Error:` prefix.
