Put a human between the agent and its risky tools. The run pauses **before** a risky call, returns its whole state as plain JSON, and resumes later (possibly in another process, after a restart) with a human decision for each paused call: approve, deny or edit.

Tools are `{ name, description, parameters, execute(args), requiresApproval? }`. `requiresApproval` is `true` (always ask), a function of the parsed arguments that returns `true` when the call needs approval (`(args) => args.amount > 100`), or absent (never ask). The model is anything with `generate(request)`.

## State and results

The state is `{ messages, steps, pending }`, plain JSON only (no functions, class instances or `undefined` values), so `JSON.parse(JSON.stringify(state))` restores it exactly:

- `messages`: the conversation, as in the agent loop (user task, assistant turns with `toolCalls`, tool results with `toolCallId`);
- `steps`: model calls made so far;
- `pending`: the calls waiting for a human, each `{ toolCallId, name, arguments }` with the parsed arguments.

A run returns one of:

- `{ status: 'done', answer, state }`: the model replied without tool calls;
- `{ status: 'interrupted', pending, state }`: at least one call waits for a decision (`pending` equals `state.pending`);
- `{ status: 'max_steps', state }`: `maxSteps` model calls (counted across start and resumes) without a final answer.

## 1. `startAgent(model, { task, tools, maxSteps })`

Run the agent loop from `[{ role: 'user', content: task }]`, passing the tool definitions `{ name, description, parameters }` on every call. For each tool call of a response, in order:

- unknown tool or arguments that are not a JSON object: append an `Error: ...` tool result;
- the tool requires approval for these arguments: add it to `pending` and **do not run it**;
- otherwise: run it now and append its result (a string as is, anything else as `JSON.stringify`; a thrown error becomes `Error: <message>`).

After the whole response, if anything is pending, return `interrupted` without calling the model again.

## 2. `resumeAgent(model, { tools, maxSteps }, state, decisions)`

`state` is a saved state (already through a JSON round trip) and `decisions` maps each pending `toolCallId` to a decision:

- `{ type: 'approve' }`: run the tool with the original arguments; the tool result is the tool's result;
- `{ type: 'deny', reason? }`: do not run the tool; the tool result starts with `Denied` and includes the reason when given;
- `{ type: 'edit', arguments }`: run the tool with the human's arguments instead; the tool result contains the tool's result (you may add a note about the edit).

If any pending call has no decision, throw an error before running anything. Otherwise append one tool result per pending call, clear `pending`, and continue the loop exactly like `startAgent` (it may interrupt again). Do not mutate the `state` object you received.

The tests restart the "process" between start and resume by serializing the state and building fresh tool objects, then check which tools ran with which arguments and that every tool call id gets exactly one result.
