Write the tools ADR for **Relay**, the support copilot of an online store.

## Briefing

Relay answers customers in the help widget and drafts actions for human support agents. It must reach five systems:

| System id | What it is | Owner | Used by | Notes |
| --- | --- | --- | --- | --- |
| `orders-db` | Order database, read-only queries | support platform team (builds Relay) | Relay only | fast lookups by order id or email |
| `refunds` | Refund service | payments team | Relay only | moves money; every refund must be **approved by a human support agent** |
| `knowledge-base` | Help center articles | docs team | Relay, the internal chat assistant and engineers' IDE agents | read-only |
| `crm` | Customer records | sales operations | Relay and the sales assistant | the vendor ships an official MCP server |
| `carrier-claims` | ShipFast's claims agent | ShipFast, an external carrier | Relay | an opaque agent with a published Agent Card; a lost-parcel claim takes **2 to 10 days** and may ask for photos |

Constraints:

- **Tool overload:** Relay connects to the company MCP gateway, which exposes **64 tools** averaging **350 tokens** per definition (22 400 tokens). The tool definitions in one request may use at most **6 000 tokens**.
- **Latency:** a model round with tool calls takes about **1.2 s at p95**, and a reply must be ready within **8 s**.
- **Outputs:** no single tool result may exceed **1 500 tokens**.
- **Repository:** engineers work on Relay's code with three different coding agents and want one vendor-neutral context file.

## Task

In `adr.py`, define three module-level dicts and lists. Keys keep the same camelCase names as the JSON contract (`"readOnly"`, `"requiresApproval"`, `"maxOutputTokens"`, `"errorContract"`, `"budgetTokens"`, `"alwaysLoaded"`, `"maxToolRounds"`, `"contextFile"`).

**`ADR`**, the record (same shape as the model ADR):

- `"id"` (positive integer), `"title"` (at least 10 characters), `"status": "accepted"`, `"layer": "harness"`;
- `"context"` (at least 80 characters) mentioning tools or MCP, the token budget, and approval or refunds;
- `"decision"` (at least 40 characters) starting with `We will`;
- `"alternatives"`: at least two `{"option": ..., "reason": ...}` with distinct options (3+ characters) and reasons of 20+ characters;
- `"consequences": {"positive": [...], "negative": [...]}`, each with at least one item of 15+ characters.

**`INTEGRATIONS`**: one `{"system": ..., "mechanism": ..., "reason": ...}` per system id of the briefing, each exactly once. `"mechanism"` is `"function-calling"`, `"mcp"` or `"a2a"`; `"reason"` has at least 20 characters.

**`TOOL_PLAN`**:

- `"tools"`: at least 4 tool entries `{"name", "system", "description", "readOnly", "requiresApproval", "maxOutputTokens", "errorContract"}` (booleans are `True`/`False`):
  - `name`: unique, lowercase snake_case (`^[a-z][a-z0-9_]*$`), at most 64 characters;
  - `system`: one of the briefing's system ids;
  - `description`: at least 40 characters;
  - `maxOutputTokens`: a positive integer;
  - `errorContract`: at least 20 characters describing how failures reach the model.
- `"loading": {"strategy", "budgetTokens", "alwaysLoaded"}`: `"strategy"` is `"all-upfront"` or `"search-on-demand"`; `"alwaysLoaded"` lists names from `"tools"`.
- `"maxToolRounds"`: a positive integer.
- `"contextFile"`: the file name of the repository context file.

The plan must be coherent with the briefing:

1. Systems used by more than one application are integrated over `mcp`; the external agent with multi-day tasks over `a2a`; no other system uses `a2a`.
2. Every tool that is not read-only requires approval, and the catalog has at least one tool for `refunds` that is not read-only.
3. Tool outputs fit the 1 500-token limit, and every `errorContract` says how errors are reported (mention `error` or `isError`).
4. Sending all 64 gateway tools would exceed the budget, so the strategy loads tools on demand; `budgetTokens` is positive and at most 6 000; the always-loaded tools at 350 tokens each fit within `budgetTokens`.
5. `maxToolRounds × 1.2 s` stays within 8 s (and is at least 2, so a tool result can be used).
6. The context file is the vendor-neutral one.

The tests check structure and coherence, not your wording.
