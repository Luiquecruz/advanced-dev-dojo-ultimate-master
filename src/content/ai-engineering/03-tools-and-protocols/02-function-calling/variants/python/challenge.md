Write the tool loop of a support assistant: parse the model's tool arguments, execute the calls, return results and errors as tool messages, and loop until the model answers in text, within a round limit.

A **tool** is a dict with a tool definition (`"name"`, `"description"`, `"parameters"`) plus `"execute"`: a function that takes the arguments dict, returns a value (or a coroutine that resolves to one) and may raise. A **tool call** from the model is a dict `{"id": ..., "name": ..., "arguments": ...}`, where `"arguments"` is a raw JSON string. Keys keep the provider's JSON names (camelCase); functions use Python names (snake_case).

## 1. `parse_tool_arguments(raw)`

Return `{"ok": True, "value": value}` when `raw` parses to a JSON object (a dict). Return `{"ok": False, "error": message}` with a non-empty message when it is not valid JSON, or when it parses to anything but an object (a list, `None`, a string, a number). Never raise.

## 2. `await execute_tool_call(call, tools)`

Return a tool message `{"role": "tool", "toolCallId": call["id"], "content": content}`. Never raise.

- **Success:** run the tool whose `"name"` matches with the parsed arguments (await the result when `execute` is a coroutine function). A string result is the `content` as is; any other result is `json.dumps`-ed.
- **Errors:** `content` is a JSON object `{"error": "<message>"}`:
  - unknown tool: the message names the requested tool and lists the names of all available tools;
  - invalid arguments: the message names the tool, and the tool is **not** executed;
  - the tool raises: the message contains the exception's message.

## 3. `await run_with_tools(model, messages, tools, max_rounds=5)`

1. Call `await model.generate({"messages": messages, "tools": definitions})` with the conversation so far and the tool **definitions only** (`"name"`, `"description"`, `"parameters"`; no `"execute"`).
2. If the response's `"toolCalls"` is empty, append `{"role": "assistant", "content": text}` and return `{"text": text, "messages": transcript, "rounds": rounds}`, where `"messages"` is the full transcript and `"rounds"` the number of model calls made.
3. Otherwise append `{"role": "assistant", "content": text, "toolCalls": tool_calls}`, then one tool message per call, in order (use `execute_tool_call`), and go back to step 1.
4. Make at most `max_rounds` model calls. If the response to the last allowed call still requests tools, raise a `ToolLoopLimitError` (already written, with a `rounds` attribute) without executing those calls.

Do not mutate the `messages` list you receive. The tests script valid calls, parallel calls, broken arguments, unknown tools, failing tools and a model that never stops; they check the transcript and the calls made, never the model's wording.
