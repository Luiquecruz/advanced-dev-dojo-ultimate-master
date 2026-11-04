Give every agent its own identity, decide every tool call with a policy decision point, and record each decision in an append-only, hash-chained audit log. Then run a model's tool calls through both.

An **agent identity** is a dict `{"id", "owner", "riskTier", "scopes", "purposes", "clearance", "status"}`: `"riskTier"` is `"low"`, `"medium"` or `"high"`; `"clearance"` is a classification; `"status"` is `"active"` or `"suspended"`. A **tool spec** is `{"name", "scope", "classification", "sideEffect"}` with `"sideEffect"` `"read"`, `"write"` or `"external"`. Classifications rank `public < internal < confidential < restricted`. Keys keep the JSON names (camelCase); functions and parameters use Python names.

## 1. `create_policy_decision_point(*, agents, tools)`

Return a `PolicyDecisionPoint` with `decide` and `suspend`. `decide(request)` takes `{"agentId", "tool", "purpose", "onBehalfOf"?}` and returns the request keys plus `"effect"` (`"allow"`, `"ask"` or `"deny"`) and `"reasons"` (a list of codes):

1. Unknown agent: deny `["unknown-agent"]`. Suspended agent: deny `["agent-suspended"]`. Unknown tool: deny `["unknown-tool"]`.
2. Otherwise collect, in this order: `"missing-scope"` (the agent lacks the tool's scope), `"purpose-not-allowed"` (the purpose is not one of the agent's), `"above-clearance"` (the tool's classification ranks above the agent's clearance). Any of them: deny with all of them.
3. Otherwise collect `"external-side-effect"` (the tool's side effect is `"external"`) and `"high-risk-write"` (a `"write"` tool and a `"high"` risk tier). Any of them: ask with them.
4. Otherwise allow with `["within-policy"]`.

`suspend(agent_id)` is the kill switch: later decisions for that agent are denied with `"agent-suspended"`. It returns `False` for an unknown agent and `True` otherwise. It must not change the `agents` passed in.

## 2. `create_audit_log(*, now)` and `verify_audit_chain(entries)`

`now()` returns milliseconds. `append(event)` stores and returns an entry `{"sequence", "timestamp", "event", "previousHash", "hash"}`: `"sequence"` counts from 0, `"timestamp"` is `iso_timestamp(now())` (provided, e.g. `"2026-10-31T09:00:00.000Z"`), `"previousHash"` is the previous entry's hash (or the module's `GENESIS_HASH`, 64 zeros, for the first), and `"hash"` is the SHA-256 hex digest of `compact_json([sequence, timestamp, previous_hash, event])` (provided; the same text as `JSON.stringify`, so Node.js and Python logs verify each other). `entries()` returns copies: changing them never changes the log.

`verify_audit_chain(entries)` returns `{"valid": True}`, or `{"valid": False, "brokenAt": index}` with the index of the first entry whose `"sequence"`, `"previousHash"` or recomputed `"hash"` does not match.

## 3. `await run_governed_tool_calls(response, context, policy, audit, tools)`

`context` is `{"agentId", "purpose", "onBehalfOf"?}`. For each tool call of the model response (`response["toolCalls"]`), in order:

1. Decide it and append `{"type": "tool-decision", "agentId", "purpose", "onBehalfOf"?, "tool", "effect", "reasons", "argumentsHash"}`, where `"argumentsHash"` is the SHA-256 hex of the raw arguments string. Never store the raw arguments.
2. Return a tool message `{"role": "tool", "toolCallId", "content"}`: `Denied: <reasons joined by ", ">`, `Approval required: <reasons>`, or for allowed calls the tool's output (`tools[name](parsed_arguments)`, sync or async). Arguments that are not a JSON object, a missing implementation or a tool that raises give content starting with `Error:`.

The tests script tool calls with the fake model and check decisions, audit entries and what ran, never model wording.
