Build the hook pipeline of a harness: pre-tool hooks that block or rewrite a call, post-tool hooks that redact or audit its output, ordered execution, and failing closed when a hook breaks. Then run a model's tool calls through it.

A **call** is a dict `{"name": ..., "arguments": {...}}` with `"arguments"` as a dict. A hook is a `Hook(name, matcher, run)` (a dataclass defined in the starter); `run` may be a plain function or an `async` one:

- a **matcher** is `"*"` (every tool), one tool name (`"Bash"`), or names separated by `|` (`"Edit|Write"`);
- a **pre-tool hook** `run(call)` returns `{"action": "continue"}`, `{"action": "block", "reason": ...}` or `{"action": "rewrite", "arguments": {...}}`;
- a **post-tool hook** `run(call, output)` returns `{"action": "continue"}` or `{"action": "replace", "output": ...}`.

The starter defines `DANGEROUS_COMMANDS` and `SECRET_PATTERNS`, two lists of compiled regular expressions.

## 1. `create_hook_runner(*, pre=(), post=(), timeout_ms=1000)`

Return a runner with an async `run(call, execute)`, where `execute(call)` runs the tool and returns its output text (plain or async). `await runner.run(...)` returns one of:

- `{"status": "ok", "output": ..., "arguments": ...}`: the final output and the arguments the tool ran with;
- `{"status": "blocked", "hook": ..., "reason": ...}`: the name of the hook that stopped the call and why.

Rules:

1. Run the matching pre-tool hooks in their order. Each sees the call with the arguments left by the previous hooks. `rewrite` replaces the arguments for the following hooks and the tool. The first `block` stops everything: no later hook runs and `execute` is not called.
2. Call `execute` once with the final call. Exceptions raised by the tool reach the caller unchanged.
3. Run the matching post-tool hooks in their order. Each sees the final call and the output left by the previous hooks; `replace` changes the output.
4. **Fail closed.** If a hook raises, takes longer than `timeout_ms` (use `asyncio.wait_for` on an async result), or returns anything other than the actions above, the result is `{"status": "blocked", "hook": ..., "reason": ...}` with that hook's name. For a pre-tool hook the tool does not run; for a post-tool hook the output is withheld.

## 2. Built-in hooks

- `block_dangerous_commands()`: name `"block-dangerous-commands"`, matcher `"Bash"`. Blocks when `arguments["command"]` matches any of `DANGEROUS_COMMANDS` (`pattern.search`), with a reason that quotes the command; otherwise continues.
- `cap_timeout(max_ms)`: name `"cap-timeout"`, matcher `"Bash"`. Rewrites the arguments with `"timeoutMs"` set to the smaller of the given `"timeoutMs"` and `max_ms`, or to `max_ms` when `"timeoutMs"` is missing or not a number. Other arguments stay as they are.
- `redact_secrets()`: name `"redact-secrets"`, matcher `"*"`. Replaces every match of every `SECRET_PATTERNS` entry in the output with `[REDACTED]`.

## 3. `run_tool_calls(response, runner, tools)`

`response` is a model response dict; `tools` maps tool names to `execute` functions. For each entry of `response["toolCalls"]`, in order, return a tool message `{"role": "tool", "toolCallId": ..., "content": ...}`:

- arguments that are not a JSON object, or a tool missing from `tools`: `"content"` starts with `Error:`, and nothing runs;
- a blocked call: `"content"` starts with `Blocked by <hook>:` followed by the reason;
- otherwise: the output.

The tests use their own hooks too (audit logs, slow hooks, broken hooks), and check what runs and what the model sees, never the wording of model output.
