Write the tool loop of a support assistant: parse the model's tool arguments, execute the calls, return results and errors as tool messages, and loop until the model answers in text, within a round limit.

A **tool** is a tool definition (`name`, `description`, `parameters`) plus `execute(args)`, which returns a value (or a promise of one) and may throw. A **tool call** from the model is `{ id, name, arguments }`, where `arguments` is a raw JSON string.

## 1. `parseToolArguments(raw)`

Return `{ ok: true, value }` when `raw` parses to a JSON object. Return `{ ok: false, error }` with a non-empty message when it is not valid JSON, or when it parses to anything but an object (an array, `null`, a string, a number). Never throw.

## 2. `executeToolCall(call, tools)`

Return a tool message `{ role: 'tool', toolCallId: call.id, content }`. Never throw.

- **Success:** run the tool whose `name` matches with the parsed arguments. A string result is the `content` as is; any other result is `JSON.stringify`-ed.
- **Errors:** `content` is a JSON object `{ "error": "<message>" }`:
  - unknown tool: the message names the requested tool and lists the names of all available tools;
  - invalid arguments: the message names the tool, and the tool is **not** executed;
  - the tool throws: the message contains the thrown error's message.

## 3. `runWithTools(model, { messages, tools, maxRounds = 5 })`

1. Call `model.generate({ messages, tools })` with the conversation so far and the tool **definitions only** (`name`, `description`, `parameters`; no `execute`).
2. If the response has no tool calls, append `{ role: 'assistant', content: text }` and return `{ text, messages, rounds }`, where `messages` is the full transcript and `rounds` the number of model calls made.
3. Otherwise append `{ role: 'assistant', content: text, toolCalls }`, then one tool message per call, in order (use `executeToolCall`), and go back to step 1.
4. Make at most `maxRounds` model calls. If the response to the last allowed call still requests tools, throw a `ToolLoopLimitError` (exported, with a `rounds` property) without executing those calls.

Do not mutate the `messages` array you receive. The tests script valid calls, parallel calls, broken arguments, unknown tools, failing tools and a model that never stops; they check the transcript and the calls made, never the model's wording.
