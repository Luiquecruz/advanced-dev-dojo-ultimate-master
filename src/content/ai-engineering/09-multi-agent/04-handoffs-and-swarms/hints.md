`handoffToolName` is two replaces: `/[^a-z0-9]+/g` to `'_'` on the lowercased name, then `/^_+|_+$/g` to `''`. `isPingPong` destructures `path.slice(-4)` into four names and checks `first === third`, `second === fourth` and `first !== second`.
---
Find the target with `agent.handoffs.find((name) => handoffToolName(name) === call.name)`. Comparing against the tool names you offered, instead of stripping the `transfer_to_` prefix, is what rejects both invented tools and real agents this agent may not reach.
---
Both a rejection and a handoff append the same pair of messages: the assistant message carrying `toolCalls: [call]`, then `{ role: 'tool', toolCallId: call.id, content }`. Only the content differs, and only a handoff changes `current`, `path` and `handoffs`.
---
Check the guards before mutating anything: `isPingPong([...path, target])` first, then `handoffs.length >= maxHandoffs`. A small `finish(status, answer)` helper that returns `{ status, answer, agent: current, path, handoffs, turns }` keeps every exit consistent.
