Build the loop at the heart of every agent: call the model with the conversation and the tools, run the tool calls it asks for, append the results, and call it again until it answers without tools.

Tools are plain objects `{ name, description, parameters, execute(args) }`. `parameters` is a JSON Schema object; `execute` receives the parsed arguments object and returns a value (or a promise of one), or throws. The model is anything with `generate(request)`; the tests pass `createModel()` from `@dojo/ai`.

## 1. `executeToolCall(tools, call)`

`call` is a tool call from a response: `{ id, name, arguments }`, where `arguments` is the **raw JSON string** the model produced. Return the text of the tool result. This function never throws:

- unknown tool name: return a string starting with `Error:` that names the tool and lists the available tool names;
- `arguments` that do not parse, or parse to something other than an object: return a string starting with `Error:` and do not run the tool;
- `execute` throws: return `Error:` followed by the error message;
- otherwise return the result: a string as is, anything else as `JSON.stringify(result)`.

## 2. `runAgent(model, { task, tools, maxSteps, system? })`

1. Start the conversation with `{ role: 'system', content: system }` when `system` is given, then `{ role: 'user', content: task }`.
2. Each step calls `model.generate({ messages, tools })`, where `tools` are the definitions `{ name, description, parameters }` of every tool, and appends the reply as `{ role: 'assistant', content: text, toolCalls }`.
3. If the reply's `finishReason` is `'refusal'` or `'content_filter'`, stop with status `'refused'`.
4. If the reply has no tool calls, stop with status `'done'`; its text is the answer.
5. Otherwise run every tool call in order with `executeToolCall` and append one `{ role: 'tool', toolCallId: call.id, content }` message per call, then take the next step.
6. After `maxSteps` model calls without a final answer, stop with status `'max_steps'`.

Return `{ status, answer, steps, messages }`: `answer` is the final text for `'done'` and `null` otherwise, `steps` is the number of model calls made, and `messages` is the whole conversation including the last assistant turn.

The tests script tool calls, broken arguments, unknown tools, failing tools, refusals and models that never stop, and react to your tool results with `fakeModel.handle`. They check the messages you send and the status you return, never the wording of your error texts beyond the `Error:` prefix.
