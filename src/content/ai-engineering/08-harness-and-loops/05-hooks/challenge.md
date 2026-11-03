Build the hook pipeline of a harness: pre-tool hooks that block or rewrite a call, post-tool hooks that redact or audit its output, ordered execution, and failing closed when a hook breaks. Then run a model's tool calls through it.

A **call** is `{ name, arguments }` with `arguments` as an object. A hook has a `name`, a `matcher` and a `run` function, which may return a value or a promise:

- a **matcher** is `'*'` (every tool), one tool name (`'Bash'`), or names separated by `|` (`'Edit|Write'`);
- a **pre-tool hook** `run(call)` returns `{ action: 'continue' }`, `{ action: 'block', reason }` or `{ action: 'rewrite', arguments }`;
- a **post-tool hook** `run(call, output)` returns `{ action: 'continue' }` or `{ action: 'replace', output }`.

The starter exports `DANGEROUS_COMMANDS` and `SECRET_PATTERNS`, two lists of regular expressions.

## 1. `createHookRunner({ pre = [], post = [], timeoutMs = 1000 })`

Return `{ run(call, execute) }`, where `execute(call)` runs the tool and returns its output text (or a promise of it). `run` resolves to one of:

- `{ status: 'ok', output, arguments }`: the final output and the arguments the tool ran with;
- `{ status: 'blocked', hook, reason }`: the name of the hook that stopped the call and why.

Rules:

1. Run the matching pre-tool hooks in their order. Each sees the call with the arguments left by the previous hooks. `rewrite` replaces the arguments for the following hooks and the tool. The first `block` stops everything: no later hook runs and `execute` is not called.
2. Call `execute` once with the final call. Errors thrown by the tool reach the caller unchanged.
3. Run the matching post-tool hooks in their order. Each sees the final call and the output left by the previous hooks; `replace` changes the output.
4. **Fail closed.** If a hook throws, rejects, takes longer than `timeoutMs`, or returns anything other than the actions above, the result is `{ status: 'blocked', hook, reason }` with that hook's name. For a pre-tool hook the tool does not run; for a post-tool hook the output is withheld.

## 2. Built-in hooks

- `blockDangerousCommands()`: name `'block-dangerous-commands'`, matcher `'Bash'`. Blocks when `arguments.command` matches any of `DANGEROUS_COMMANDS`, with a reason that quotes the command; otherwise continues.
- `capTimeout(maxMs)`: name `'cap-timeout'`, matcher `'Bash'`. Rewrites the arguments with `timeoutMs` set to the smaller of the given `timeoutMs` and `maxMs`, or to `maxMs` when `timeoutMs` is missing or not a number. Other arguments stay as they are.
- `redactSecrets()`: name `'redact-secrets'`, matcher `'*'`. Replaces every match of every `SECRET_PATTERNS` entry in the output with `[REDACTED]`.

## 3. `runToolCalls(response, runner, tools)`

`response` is a model response; `tools` maps tool names to `execute` functions. For each tool call, in order, return a tool message `{ role: 'tool', toolCallId, content }`:

- arguments that are not a JSON object, or a tool missing from `tools`: `content` starts with `Error:`, and nothing runs;
- a blocked call: `content` starts with `Blocked by <hook>:` followed by the reason;
- otherwise: the output.

The tests use their own hooks too (audit logs, slow hooks, broken hooks), and check what runs and what the model sees, never the wording of model output.
