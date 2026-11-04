Build the Ledgerly Support Copilot: retrieval, tools over MCP, a budgeted agent with a verifier inside a permission policy, an eval gate, a threat model and a governance map. The project has eight files; three are complete and five are yours.

| File | Status | Contents |
| --- | --- | --- |
| `briefing.ts` | complete | `BRIEFING`, `DOCUMENTS` (help articles with ids), `INVOICES` (one carries an injected note), `GOLDEN_SET` |
| `mcp.ts` | complete | an MCP server for the 2026-07-28 revision (`tools/list`, `tools/call`, version in `_meta`), `createMcpClient(server)` with `listTools()` and `callTool(name, args)` → `{ isError, text, structuredContent? }`, and `createSupportServer({ retriever, invoices })` with the tools `search_docs`, `get_invoice`, `issue_refund`, `send_email` and the logs `executed`, `refunds`, `outbox` |
| `main.ts` | complete | wiring: `MODEL_ID`, `DEFAULT_BUDGET`, `EVAL_THRESHOLD`, `createSupportAssistant({ model?, approve?, budget? })`, `evaluateAssistant(assistant)`, and re-exports of every file |
| `retrieval.ts` | **implement** | `createRetriever` |
| `policy.ts` | **implement** | `decide` (`SUPPORT_POLICY` is given) |
| `agent.ts` | **implement** | `citedSources`, `citationVerifier`, `runAgent` |
| `evals.ts` | **implement** | `runEvals` |
| `governance.ts` | **fill in** | `threatModel`, `governanceMap` |

## 1. `createRetriever(documents)` (`retrieval.ts`)

Embed every document once as `<title>\n<text>` with `embed`. `search(query, { topK = 3, minScore = 0.1 })` returns `{ id, title, text, score }` hits: `score` is `cosineSimilarity` with the query's embedding, hits below `minScore` are dropped, the rest sorted by score (highest first, ties by id) and cut to `topK`.

## 2. `decide(policy, { name, arguments })` (`policy.ts`)

A rule `{ tool, decision, reason, when? }` matches when its `tool` pattern matches the whole name (`*` matches any characters) and `when` is absent or returns `true` for the arguments. Among matching rules, any `deny` wins, then `ask`, then `allow`, whatever their order; return `{ decision, reason }` of the first matching rule with the winning decision. When nothing matches, return `deny` with a reason that contains `No rule`.

## 3. `citedSources(answer)` and `citationVerifier(answer, sources)` (`agent.ts`)

`citedSources` returns the unique ids written in square brackets (lowercase letters and digits in groups joined by single hyphens, such as `[refund-policy]`), in order. `citationVerifier` fails when nothing is cited, or when a cited id is not in `sources` (its `feedback` names those ids); otherwise `{ passed: true }`.

## 4. `runAgent(question, options)` (`agent.ts`)

`options`: `{ model, client, policy, budget: { maxSteps, maxCostUsd }, approve?, verify = citationVerifier, system = DEFAULT_SYSTEM }`.

1. Get the tool definitions with `client.listTools()` and pass them on every model call. Messages start with the system prompt and the question.
2. Before each call: if `maxSteps` calls were made, stop with `max_steps`; if the summed `usage.cost` is at or above `maxCostUsd`, stop with `max_cost`.
3. After each call, count the step and its cost and append the assistant turn (with its `toolCalls`). A `refusal` or `content_filter` finish stops with `refused`.
4. For each tool call, append a `tool` message (`toolCallId` set) and a record `{ name, decision, executed, isError }`:
   - a name not in the tool list, or arguments that are not a JSON object: decision `'invalid'`, content contains `Unknown tool` or `Invalid arguments`;
   - `decide` says `deny`: content contains `Denied by policy` and the reason;
   - `ask`: call `approve({ name, arguments })`; without `approve`, or when it returns `false`, content contains `Not approved`;
   - otherwise `client.callTool`: `executed: true`, `isError` from the result, content is the result text. A successful `search_docs` adds the ids of `structuredContent.hits` to `sources` (unique, in order).
   Only executed calls reach the server.
5. A reply without tool calls goes to `verify(text, sources)`. Passed: stop with `answered` and the text. Failed: count a verifier failure, append a `user` message containing `Verifier` and the feedback, and continue.

Return `{ status, answer, sources, toolCalls, steps, costUsd, verifierFailures }`; `answer` is `null` unless the status is `answered`.

## 5. `runEvals(cases, answer, { threshold })` (`evals.ts`)

Run the cases in order with `answer(question)`. A case passes when the status is `answered`, the answer cites every `expectedSources` id and contains every `mustMention` text (case-insensitive). Each case result is `{ id, pass, status, reasons, costUsd }`; reasons are `status <status>`, `missing source <id>` and `missing "<text>"`. A thrown error makes a failed case with status `error`, a reason containing the message and cost `0`. Return `{ cases, passed, total, passRate, totalCostUsd, criticalFailures, gatePassed }`: `passRate` is `0` without cases, `criticalFailures` lists the failed critical case ids, and the gate passes when `passRate >= threshold` and no critical case failed.

## 6. `threatModel` and `governanceMap` (`governance.ts`)

The tests check coherence, not wording:

- `trifecta`: each leg lists at least one server tool, `get_invoice` holds private data, and every tool of `removedLeg` is denied by `SUPPORT_POLICY`. At least four threats with unique ids, a reference (one for prompt injection: `LLM01` or `ASI01`), a mitigation and a control, covering at least `policy`, `human-approval`, `budget` and `eval-gate`.
- `governanceMap.tools`: exactly the server's tools, each owned by one of `owners`, with `approval` matching the policy decision for a call with no arguments (`allow` → `none`, `ask` → `human`, `deny` → `blocked`); invoice and refund tools are `confidential`.
- The model is `MODEL_ID`, pinned, without `latest`, with a promotion rule; `budgets` equal `DEFAULT_BUDGET`; the gate uses `EVAL_THRESHOLD` and lists the critical golden cases; the review cadence is `monthly` or `quarterly`; at least one regulation is named.

The last test runs the whole assistant on the golden set across seeds and replays the injected invoice note: the gate must pass and no email may be sent.
