Write the permission policy of a coding agent's harness: pattern matching for commands and paths, deny-ask-allow precedence, compound shell commands, path traversal, and a review step for the tool calls a model proposes.

A **policy** is `{ allow: string[], ask: string[], deny: string[] }`. Each rule is either a bare tool name (`Read`) or a tool name with a pattern (`Bash(npm test*)`). A **call** is `{ name, arguments }`, where `arguments` is an object.

The starter exports `PRIMARY_ARGUMENT`, the argument a pattern is matched against for each tool: `command` for `Bash`, `path` for `Read`, `Edit` and `Write`, `url` for `Fetch`. `Read`, `Edit` and `Write` are **path tools**; every other tool uses command matching.

## 1. `matchesCommand(pattern, command)`

`true` when the whole command matches the pattern. `*` matches any sequence of characters (including none, spaces and `/`); every other character is literal (a `.` or `(` in the pattern matches only itself). Trim the command and collapse runs of whitespace to one space before matching.

## 2. `matchesPath(pattern, path)`

Normalize the path first (POSIX normalization: `./src/a.ts` becomes `src/a.ts`, `src/../.env` becomes `.env`). A normalized path that is absolute or starts with `..` is outside the project and matches no pattern. Then match the whole path: `**` matches any characters including `/`, a `**/` prefix also matches zero directories (`**/.env` matches `.env`), `*` matches any characters except `/`, and `?` matches one character except `/`.

## 3. `splitCommand(command)`

Split a shell command on `&&`, `||`, `;`, `|` and newlines; return the trimmed, non-empty parts in order.

## 4. `evaluate(policy, call)`

Return `{ decision, rule }`, where `decision` is `'allow'`, `'ask'` or `'deny'` and `rule` is the matching rule text, or `null`.

- A rule's tool name matches the call's `name` exactly; a `*` in the tool name matches any characters (`mcp__github__*`).
- A bare rule matches every call of its tool. A rule with a pattern matches only when the tool has a primary argument, the call has it as a string, and the pattern matches it (`matchesPath` for path tools, `matchesCommand` otherwise).
- Check `deny` rules first, then `ask`, then `allow`; the first matching rule decides. When nothing matches, return `{ decision: 'ask', rule: null }`.
- For a path tool whose path is outside the project (see `matchesPath`), return `{ decision: 'deny', rule: null }` before checking any rule.
- For `Bash`, evaluate every part of `splitCommand(command)` as its own call and return the most restrictive result (`deny` over `ask` over `allow`); between parts with the same decision, the first part's result wins. A command with no parts is `{ decision: 'ask', rule: null }`.

## 5. `reviewToolCalls(response, policy, knownTools)`

`response` is a model response (from `generate`). For each entry of `response.toolCalls`, in order, return `{ toolCallId, name, decision, rule }`:

- a tool whose name is not in `knownTools`, or arguments that are not a JSON object (unparseable JSON, an array, a number), fail closed: `decision: 'deny'`, `rule: null`;
- otherwise, the result of `evaluate` on `{ name, arguments }`.

The tests check decisions and the rules reported, never the wording of model output.
