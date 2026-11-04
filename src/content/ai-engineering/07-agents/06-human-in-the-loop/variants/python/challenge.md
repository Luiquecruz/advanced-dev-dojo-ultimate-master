Put a human between the agent and its risky tools. The run pauses **before** a risky call, returns its whole state as plain JSON, and resumes later (possibly in another process, after a restart) with a human decision for each paused call: approve, deny or edit.

Tools are dicts `{"name", "description", "parameters", "execute", "requiresApproval"}`. `"requiresApproval"` is `True` (always ask), a function of the parsed arguments that returns `True` when the call needs approval (`lambda arguments: arguments["amount"] > 100`), or absent (never ask). The model is anything with `await model.generate(request)`. Dicts keep the camelCase keys of the JSON contract; functions and parameters use Python names.

## State and results

The state is a dict `{"messages", "steps", "pending"}` of plain JSON only (dicts, lists, strings, numbers, booleans and `None`; no functions or class instances), so `json.loads(json.dumps(state))` restores it exactly:

- `"messages"`: the conversation, as in the agent loop (user task, assistant turns with `"toolCalls"`, tool results with `"toolCallId"`);
- `"steps"`: model calls made so far;
- `"pending"`: the calls waiting for a human, each `{"toolCallId", "name", "arguments"}` with the parsed arguments.

A run returns one of:

- `{"status": "done", "answer": ..., "state": ...}`: the model replied without tool calls;
- `{"status": "interrupted", "pending": [...], "state": ...}`: at least one call waits for a decision (`"pending"` equals `state["pending"]`);
- `{"status": "max_steps", "state": ...}`: `max_steps` model calls (counted across start and resumes) without a final answer.

## 1. `start_agent(model, task, tools, max_steps)`

Run the agent loop from `[{"role": "user", "content": task}]`, passing the tool definitions `{"name", "description", "parameters"}` on every call. For each tool call of a response, in order:

- unknown tool or arguments that are not a JSON object: append an `Error: ...` tool result;
- the tool requires approval for these arguments: add it to `"pending"` and **do not run it**;
- otherwise: run it now and append its result (a string as is, anything else as `json.dumps`; a raised exception becomes `Error: <message>`).

After the whole response, if anything is pending, return `interrupted` without calling the model again.

## 2. `resume_agent(model, saved_state, decisions, tools, max_steps)`

`saved_state` is a saved state (already through a JSON round trip) and `decisions` maps each pending `"toolCallId"` to a decision dict:

- `{"type": "approve"}`: run the tool with the original arguments; the tool result is the tool's result;
- `{"type": "deny", "reason": ...}` (`"reason"` optional): do not run the tool; the tool result starts with `Denied` and includes the reason when given;
- `{"type": "edit", "arguments": {...}}`: run the tool with the human's arguments instead; the tool result contains the tool's result (you may add a note about the edit).

If any pending call has no decision, raise an exception before running anything. Otherwise append one tool result per pending call, clear `"pending"`, and continue the loop exactly like `start_agent` (it may interrupt again). Do not mutate the `saved_state` dict you received.

The tests restart the "process" between start and resume by serializing the state and building fresh tool dicts, then check which tools ran with which arguments and that every tool call id gets exactly one result.
