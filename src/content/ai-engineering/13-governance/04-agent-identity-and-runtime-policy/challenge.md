Give every agent its own identity, decide every tool call with a policy decision point, and record each decision in an append-only, hash-chained audit log. Then run a model's tool calls through both.

An **agent identity** is `{ id, owner, riskTier, scopes, purposes, clearance, status }`: `riskTier` is `'low'`, `'medium'` or `'high'`; `clearance` is a classification; `status` is `'active'` or `'suspended'`. A **tool spec** is `{ name, scope, classification, sideEffect }` with `sideEffect` `'read'`, `'write'` or `'external'`. Classifications rank `public < internal < confidential < restricted`.

## 1. `createPolicyDecisionPoint({ agents, tools })`

Return `{ decide, suspend }`. `decide({ agentId, tool, purpose, onBehalfOf? })` returns the request fields plus `effect` (`'allow'`, `'ask'` or `'deny'`) and `reasons` (a list of codes):

1. Unknown agent: deny `['unknown-agent']`. Suspended agent: deny `['agent-suspended']`. Unknown tool: deny `['unknown-tool']`.
2. Otherwise collect, in this order: `'missing-scope'` (the agent lacks the tool's scope), `'purpose-not-allowed'` (the purpose is not one of the agent's), `'above-clearance'` (the tool's classification ranks above the agent's clearance). Any of them: deny with all of them.
3. Otherwise collect `'external-side-effect'` (the tool's side effect is `'external'`) and `'high-risk-write'` (a `'write'` tool and a `'high'` risk tier). Any of them: ask with them.
4. Otherwise allow with `['within-policy']`.

`suspend(agentId)` is the kill switch: later decisions for that agent are denied with `'agent-suspended'`. It returns `false` for an unknown agent. It must not change the `agents` passed in.

## 2. `createAuditLog({ now })` and `verifyAuditChain(entries)`

`append(event)` stores and returns an entry `{ sequence, timestamp, event, previousHash, hash }`: `sequence` counts from 0, `timestamp` is `new Date(now()).toISOString()`, `previousHash` is the previous entry's hash (or the exported `GENESIS_HASH`, 64 zeros, for the first), and `hash` is the SHA-256 hex digest of `JSON.stringify([sequence, timestamp, previousHash, event])`. `entries()` returns copies: changing them never changes the log.

`verifyAuditChain(entries)` returns `{ valid: true }`, or `{ valid: false, brokenAt }` with the index of the first entry whose `sequence`, `previousHash` or recomputed `hash` does not match.

## 3. `runGovernedToolCalls(response, { agentId, purpose, onBehalfOf? }, policy, audit, tools)`

For each tool call of a model response, in order:

1. Decide it and append `{ type: 'tool-decision', agentId, purpose, onBehalfOf?, tool, effect, reasons, argumentsHash }`, where `argumentsHash` is the SHA-256 hex of the raw arguments string. Never store the raw arguments.
2. Return a tool message `{ role: 'tool', toolCallId, content }`: `Denied: <reasons joined by ", ">`, `Approval required: <reasons>`, or for allowed calls the tool's output (`tools[name](parsedArguments)`). Arguments that are not a JSON object, a missing implementation or a tool that throws give content starting with `Error:`.

The tests script tool calls with the fake model and check decisions, audit entries and what ran, never model wording.
