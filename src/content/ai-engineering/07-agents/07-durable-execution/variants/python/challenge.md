Make an agent run survive a crash. The run checkpoints its state to a store after every step; when it is started again with the same run id, it continues from the last checkpoint instead of from the beginning, and an **idempotency key** makes sure a side effect that already happened is not repeated.

Tools are dicts `{"name", "description", "parameters", "execute"}`, where `execute(arguments, context)` receives the parsed arguments and a context dict `{"idempotencyKey": ...}`. The payment tool in the tests behaves like a real payment provider: a repeated request with the same key is ignored. Dicts keep the camelCase keys of the JSON contract; functions and parameters use Python names.

A checkpoint is a plain JSON dict: `{"runId", "status", "messages", "steps", "answer"}`, with `"status"` `"running"` or `"done"` and `"answer"` `None` until done. A store is any object with `await store.load(run_id)` and `await store.save(checkpoint)`; `load` returns `None` for an unknown run.

## 1. `CheckpointStore` and `create_checkpoint_store(documents=None)`

The factory returns a `CheckpointStore` over `documents`, a dict from run id to the checkpoint's **JSON text** (a new empty dict when none is given). The dict stands for the database: it outlives the store object, so a new store over the same dict sees every saved run, as after a process restart.

- `save` stores a snapshot **atomically**: serialize the whole checkpoint with `json.dumps` first, then replace the stored document in one step. A checkpoint that cannot be serialized raises and leaves the previous document intact, and changing the checkpoint dict after a save never changes what was saved.
- `load` returns the parsed checkpoint (a fresh dict), or `None` when the run id has no document.
- Run ids may contain only letters, digits, `-` and `_`; any other id makes `load` and `save` raise (no key injection, like path traversal for files).

## 2. `idempotency_key(run_id, tool_call_id)`

Return `f"{run_id}:{tool_call_id}"`: the same value every time this run executes this tool call, and different for any other call or run.

## 3. `run_durable_agent(model, run_id, task, tools, store, max_steps)`

1. `await store.load(run_id)`. With no checkpoint, create `{"runId": run_id, "status": "running", "messages": [{"role": "user", "content": task}], "steps": 0, "answer": None}` and **save it**. If the loaded checkpoint is `"done"`, return its answer without calling the model.
2. Loop:
   - First, execute every tool call of the **last assistant message** that has no tool result yet (this finishes work interrupted by a crash), passing `{"idempotencyKey": idempotency_key(run_id, call["id"])}`. Append each result as a tool message and **save after each one**. Unknown tools and invalid arguments produce `Error: ...` results, as in the agent loop.
   - If `"steps"` reached `max_steps`, return `max_steps`.
   - Call the model with the messages and the tool definitions `{"name", "description", "parameters"}`, add one to `"steps"` and append the assistant turn. With no tool calls, set `"status": "done"` and `"answer"`. **Save** in both cases, before running any tool. When done, return.
3. Never catch exceptions from the model or the store: a failure there is the crash, and it propagates.

Return `{"status", "answer", "steps", "resumed"}`: `"status"` `"done"` or `"max_steps"`, `"answer"` the final text or `None`, `"steps"` the total model calls of the run (across crashes), and `"resumed"` `True` when a checkpoint existed at the start.

The tests crash the run by making the model or the store raise at chosen points (including the moment right after a payment and before its checkpoint), resume with the same run id, and check that each payment happened exactly once.
