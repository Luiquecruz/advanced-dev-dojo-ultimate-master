Write the permission policy of a coding agent's harness: pattern matching for commands and paths, deny-ask-allow precedence, compound shell commands, path traversal, and a review step for the tool calls a model proposes.

A **policy** is a dict `{"allow": [...], "ask": [...], "deny": [...]}` of rule strings. Each rule is either a bare tool name (`Read`) or a tool name with a pattern (`Bash(npm test*)`). A **call** is a dict `{"name": ..., "arguments": {...}}`, where `"arguments"` is a dict.

The starter defines `PRIMARY_ARGUMENT`, the argument a pattern is matched against for each tool: `command` for `Bash`, `path` for `Read`, `Edit` and `Write`, `url` for `Fetch`. `Read`, `Edit` and `Write` are **path tools**; every other tool uses command matching.

## 1. `matches_command(pattern, command)`

`True` when the whole command matches the pattern. `*` matches any sequence of characters (including none, spaces and `/`); every other character is literal (a `.` or `(` in the pattern matches only itself). Trim the command and collapse runs of whitespace to one space before matching.

## 2. `matches_path(pattern, path)`

Normalize the path first (POSIX normalization with `posixpath.normpath`: `./src/a.ts` becomes `src/a.ts`, `src/../.env` becomes `.env`). A normalized path that is absolute or starts with `..` is outside the project and matches no pattern. Then match the whole path: `**` matches any characters including `/`, a `**/` prefix also matches zero directories (`**/.env` matches `.env`), `*` matches any characters except `/`, and `?` matches one character except `/`.

## 3. `split_command(command)`

Split a shell command on `&&`, `||`, `;`, `|` and newlines; return the trimmed, non-empty parts in order.

## 4. `evaluate(policy, call)`

Return `{"decision": ..., "rule": ...}`, where `"decision"` is `"allow"`, `"ask"` or `"deny"` and `"rule"` is the matching rule text, or `None`.

- A rule's tool name matches the call's `"name"` exactly; a `*` in the tool name matches any characters (`mcp__github__*`).
- A bare rule matches every call of its tool. A rule with a pattern matches only when the tool has a primary argument, the call has it as a string, and the pattern matches it (`matches_path` for path tools, `matches_command` otherwise).
- Check `"deny"` rules first, then `"ask"`, then `"allow"`; the first matching rule decides. When nothing matches, return `{"decision": "ask", "rule": None}`.
- For a path tool whose path is outside the project (see `matches_path`), return `{"decision": "deny", "rule": None}` before checking any rule.
- For `Bash`, evaluate every part of `split_command(command)` as its own call and return the most restrictive result (`deny` over `ask` over `allow`); between parts with the same decision, the first part's result wins. A command with no parts is `{"decision": "ask", "rule": None}`.

## 5. `review_tool_calls(response, policy, known_tools)`

`response` is a model response dict (from `await model.generate(...)`). For each entry of `response["toolCalls"]` (each with `"id"`, `"name"` and `"arguments"` as a JSON string), in order, return `{"toolCallId": ..., "name": ..., "decision": ..., "rule": ...}`:

- a tool whose name is not in `known_tools`, or arguments that are not a JSON object (unparseable JSON, an array, a number), fail closed: `"decision": "deny"`, `"rule": None`;
- otherwise, the result of `evaluate` on `{"name": ..., "arguments": parsed}`.

The tests check decisions and the rules reported, never the wording of model output.
