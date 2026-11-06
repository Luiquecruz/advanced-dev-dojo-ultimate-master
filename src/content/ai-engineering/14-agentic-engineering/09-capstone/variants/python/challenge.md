Build the Ledgerly Support Copilot: retrieval, tools over MCP, a budgeted agent with a verifier inside a permission policy, an eval gate, a threat model and a governance map. The project has eight modules; three are complete and five are yours.

| File | Status | Contents |
| --- | --- | --- |
| `briefing.py` | complete | `BRIEFING`, `DOCUMENTS` (help articles with ids), `INVOICES` (one carries an injected note), `GOLDEN_SET` |
| `mcp.py` | complete | an MCP server for the `2026-07-28` revision (`tools/list`, `tools/call`, version in `_meta`), `create_mcp_client(server)` with `await list_tools()` and `await call_tool(name, arguments)` → `{"isError", "text", "structuredContent"?}`, and `create_support_server(*, retriever, invoices)` with the tools `search_docs`, `get_invoice`, `issue_refund`, `send_email` and the logs `executed`, `refunds`, `outbox` |
| `main.py` | complete | wiring: `MODEL_ID`, `DEFAULT_BUDGET`, `EVAL_THRESHOLD`, `create_support_assistant(*, model=None, approve=None, budget=DEFAULT_BUDGET)`, `await evaluate_assistant(assistant)`, and `from <module> import *` of every module |
| `retrieval.py` | **implement** | `Retriever` (`create_retriever` is given) |
| `policy.py` | **implement** | `decide` (`SUPPORT_POLICY` is given) |
| `agent.py` | **implement** | `cited_sources`, `citation_verifier`, `run_agent` |
| `evals.py` | **implement** | `run_evals` |
| `governance.py` | **fill in** | `THREAT_MODEL`, `GOVERNANCE_MAP` |

Data are plain dicts whose keys keep the camelCase names of the JSON contract (`"amountUsd"`, `"expectedSources"`, `"toolCalls"`, `"costUsd"`); functions and parameters use Python names.

## 1. `Retriever(documents)` (`retrieval.py`)

Embed every document once as `<title>\n<text>` with `embed` (a list of texts returns a list of vectors). `search(query, *, top_k=3, min_score=0.1)` returns `{"id", "title", "text", "score"}` hits: `"score"` is `cosine_similarity` with the query's embedding, hits below `min_score` are dropped, the rest sorted by score (highest first, ties by id) and cut to `top_k`.

## 2. `decide(policy, call)` (`policy.py`)

`call` is `{"name", "arguments"}`. A rule `{"tool", "decision", "reason", "when"?}` matches when its `"tool"` pattern matches the whole name (`*` matches any characters, every other character is literal) and `"when"` is absent or returns `True` for the arguments. Among matching rules, any `deny` wins, then `ask`, then `allow`, whatever their order; return `{"decision", "reason"}` of the first matching rule with the winning decision. When nothing matches, return `deny` with a reason that contains `No rule`.

## 3. `cited_sources(answer)` and `citation_verifier(answer, sources)` (`agent.py`)

`cited_sources` returns the unique ids written in square brackets (lowercase letters and digits in groups joined by single hyphens, such as `[refund-policy]`), in order. `citation_verifier` returns `{"passed": False, "feedback": ...}` when nothing is cited, or when a cited id is not in `sources` (its feedback names those ids); otherwise `{"passed": True}`.

## 4. `run_agent(question, *, model, client, policy, budget, approve=None, verify=citation_verifier, system=DEFAULT_SYSTEM)` (`agent.py`)

`budget` is `{"maxSteps", "maxCostUsd"}`.

1. Get the tool definitions with `await client.list_tools()` and pass them as `"tools"` on every `await model.generate(...)`. Messages start with the system prompt and the question.
2. Before each call: if `maxSteps` calls were made, stop with `max_steps`; if the summed `response["usage"]["cost"]` is at or above `maxCostUsd`, stop with `max_cost`.
3. After each call, count the step and its cost and append the assistant turn (with its `"toolCalls"`). A `refusal` or `content_filter` finish stops with `refused`.
4. For each tool call, append a `tool` message (`"toolCallId"` set) and a record `{"name", "decision", "executed", "isError"}`:
   - a name not in the tool list, or arguments that are not a JSON object: decision `"invalid"`, content contains `Unknown tool` or `Invalid arguments`;
   - `decide` says `deny`: content contains `Denied by policy` and the reason;
   - `ask`: call `approve({"name": ..., "arguments": ...})` (plain or `async`; await the result when it is awaitable); without `approve`, or when it returns a false value, content contains `Not approved`;
   - otherwise `await client.call_tool(name, arguments)`: `"executed": True`, `"isError"` from the result, content is the result text. A successful `search_docs` adds the ids of `result["structuredContent"]["hits"]` to `sources` (unique, in order).
   Only executed calls reach the server.
5. A reply without tool calls goes to `verify(text, sources)`. Passed: stop with `answered` and the text. Failed: count a verifier failure, append a `user` message containing `Verifier` and the feedback, and continue.

Return `{"status", "answer", "sources", "toolCalls", "steps", "costUsd", "verifierFailures"}`; `"answer"` is `None` unless the status is `answered`.

## 5. `run_evals(cases, answer, *, threshold)` (`evals.py`)

Run the cases in order with `await answer(question)`. A case passes when the status is `answered`, the answer cites every `"expectedSources"` id and contains every `"mustMention"` text (case-insensitive). Each case result is `{"id", "pass", "status", "reasons", "costUsd"}`; reasons are `status <status>`, `missing source <id>` and `missing "<text>"`. A raised exception makes a failed case with status `error`, a reason containing the message and cost `0`. Return `{"cases", "passed", "total", "passRate", "totalCostUsd", "criticalFailures", "gatePassed"}`: `"passRate"` is `0` without cases, `"criticalFailures"` lists the failed critical case ids, and the gate passes when `"passRate"` is at least `threshold` and no critical case failed.

## 6. `THREAT_MODEL` and `GOVERNANCE_MAP` (`governance.py`)

The tests check coherence, not wording:

- `"trifecta"`: each leg (`"privateData"`, `"untrustedContent"`, `"exfiltration"`) lists at least one server tool, `get_invoice` holds private data, and every tool of `"removedLeg"` is denied by `SUPPORT_POLICY`. At least four threats with unique ids, a reference (one for prompt injection: `LLM01` or `ASI01`), a mitigation and a control from `CONTROLS`, covering at least `policy`, `human-approval`, `budget` and `eval-gate`.
- `GOVERNANCE_MAP["tools"]`: exactly the server's tools, each owned by one of `"owners"`, with `"approval"` matching the policy decision for a call with no arguments (`allow` → `none`, `ask` → `human`, `deny` → `blocked`); invoice and refund tools are `confidential`.
- The model is `MODEL_ID`, pinned, without `latest`, with a promotion rule; `"budgets"` equal `DEFAULT_BUDGET`; the gate uses `EVAL_THRESHOLD` and lists the critical golden cases; the review cadence is `monthly` or `quarterly`; at least one regulation is named.

The last test runs the whole assistant on the golden set across seeds and replays the injected invoice note: the gate must pass and no email may be sent.
