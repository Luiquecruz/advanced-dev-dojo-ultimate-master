Make an agent run survive a crash. The run checkpoints its state to a store after every step; when it is started again with the same run id, it continues from the last checkpoint instead of from the beginning, and an **idempotency key** makes sure a side effect that already happened is not repeated.

Tools are `{ name, description, parameters, execute(args, context) }`, where `context` is `{ idempotencyKey }`. The payment tool in the tests behaves like a real payment provider: a repeated request with the same key is ignored.

A checkpoint is plain JSON: `{ runId, status, messages, steps, answer }`, with `status` `'running'` or `'done'` and `answer` `null` until done. A store is `{ load(runId), save(checkpoint) }`, both async; `load` returns `undefined` for an unknown run.

## 1. `createFileStore(directory = '/app/checkpoints')`

A store on the file system (`node:fs/promises`). Each run lives in `<directory>/<runId>.json`.

- `save` creates the directory when needed and writes **atomically**: write `<file>.tmp`, then rename it over the file, so a crash never leaves half a checkpoint. No `.tmp` file remains after a save.
- `load` returns the parsed checkpoint, or `undefined` when the file does not exist (`ENOENT`); other errors propagate.
- Run ids may contain only letters, digits, `-` and `_`; any other id makes `load` and `save` fail (no path traversal).

## 2. `idempotencyKey(runId, toolCallId)`

Return `` `${runId}:${toolCallId}` ``: the same value every time this run executes this tool call, and different for any other call or run.

## 3. `runDurableAgent(model, { runId, task, tools, store, maxSteps })`

1. `load(runId)`. With no checkpoint, create `{ runId, status: 'running', messages: [{ role: 'user', content: task }], steps: 0, answer: null }` and **save it**. If the loaded checkpoint is `'done'`, return its answer without calling the model.
2. Loop:
   - First, execute every tool call of the **last assistant message** that has no tool result yet (this finishes work interrupted by a crash), passing `{ idempotencyKey: idempotencyKey(runId, call.id) }`. Append each result as a tool message and **save after each one**. Unknown tools and invalid arguments produce `Error: ...` results, as in the agent loop.
   - If `steps` reached `maxSteps`, return `max_steps`.
   - Call the model with the messages and the tool definitions `{ name, description, parameters }`, add one to `steps` and append the assistant turn. With no tool calls, set `status: 'done'` and `answer`. **Save** in both cases, before running any tool. When done, return.
3. Never catch errors from the model or the store: a failure there is the crash, and it propagates.

Return `{ status, answer, steps, resumed }`: `status` `'done'` or `'max_steps'`, `answer` the final text or `null`, `steps` the total model calls of the run (across crashes), and `resumed` `true` when a checkpoint existed at the start.

The tests crash the run by making the model or the store throw at chosen points (including the moment right after a payment and before its checkpoint), resume with the same run id, and check that each payment happened exactly once.
