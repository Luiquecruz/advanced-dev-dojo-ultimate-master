# Checkpoint: the Tools ADR

This module went from one tool call to an ecosystem: function calling, tool design, MCP servers and clients, tool overload, A2A, skills and context files. The checkpoint turns it into the second entry of your portfolio: an **Architecture Decision Record** for the harness of a concrete product, plus three artifacts a teammate can implement: the **integration map** (which mechanism reaches each system), the **tool catalog** and the **loading plan**.

A tools ADR is rarely "we use MCP for everything". Each system gets the cheapest mechanism that meets its needs, every tool gets an interface designed for a model, and the context budget decides how tools reach the model.

## The decision checklist

1. **Integration per system.** Ask who uses it and what it is.
   - Used by one application and owned by the same team: **function calling** in process. Simplest, fastest, easiest to guard.
   - Shared by several hosts (chat app, IDE agents, other assistants), owned by another team, or already offered as a vendor server: **MCP**.
   - Another organization's **agent** doing long, stateful work that may need input: **A2A**. Wrapping it as a synchronous tool hides days of waiting behind a timeout.
2. **Side effects.** Mark every tool read-only or not. Write tools (refunds, emails, claims) need idempotency and, when money or customers are involved, a human approval enforced by your code, not by the prompt.
3. **Interface quality.** Names, descriptions, schemas, error contracts and output limits, per lesson 03. Every error has a defined way back to the model (`isError` results or `{ error }` tool messages).
4. **Context budget.** Multiply tools by their average definition size and compare with the budget. If everything fits, send everything and keep it simple. If not, namespace, subset and **load on demand**, keeping the few always-needed tools loaded.
5. **Loop limits.** Translate the latency budget into a maximum number of tool rounds, and decide what happens when it is reached.
6. **Repository context.** Agree on one context file for the coding agents that work on the product, so rules are written once.

| Mechanism | Buys | Costs |
| --- | --- | --- |
| Function calling | no extra hop, full control, simple tests | not reusable by other applications |
| MCP | one integration for every host, vendor servers, standard auth | a protocol and a server to run, pin and review |
| A2A | delegation of long, opaque work with tasks, input requests and push updates | persistence, webhooks, cross-company trust |
| On-demand loading | small, focused tool lists within budget | one extra round when a tool is missing |

## Writing the ADR well

- **Context** names the forces with numbers: who uses each system, the approval rule, the tool count and size against the budget, round latency against the reply budget.
- **Decision** is one "We will" sentence naming the mechanisms, the loading strategy, the approval rule and the round limit.
- **Alternatives** are the proposals someone will make later ("send all tools", "wrap the partner agent as a tool", "let the copilot refund on its own"), each with the fact that rules it out.
- **Consequences** include the costs: the extra round for on-demand loading, the gateway and vendor servers as dependencies, persistence for A2A tasks.

## Example: an internal analytics assistant

```ts
export const integrations = [
  { system: 'warehouse', mechanism: 'mcp', reason: 'Shared by the BI assistant and IDE agents; the data team owns the server and its auth.' },
  { system: 'dashboards', mechanism: 'function-calling', reason: 'Only this assistant renders dashboards, in the same codebase.' },
];
export const toolPlan = {
  tools: [{ name: 'run_query', system: 'warehouse', description: 'Run a read-only SQL query on the analytics warehouse; returns at most 200 rows.', readOnly: true, requiresApproval: false, maxOutputTokens: 1200, errorContract: 'SQL errors return isError with the database message and the failing line.' }],
  loading: { strategy: 'all-upfront', budgetTokens: 2000, alwaysLoaded: ['run_query'] },
  maxToolRounds: 4,
  contextFile: 'AGENTS.md',
};
```

Six small tools fit easily in the budget, so this plan sends them all; Relay's 64 gateway tools do not, which changes the decision.

## Pitfalls

- One mechanism for every system, chosen by fashion instead of by who uses the system.
- Approval written as a prompt instruction ("always ask before refunding") instead of a check in code.
- No error contract: tools that throw, or return "failed" without saying why.
- A loading plan that ignores the arithmetic of tools × tokens per definition.
- A round limit chosen without the latency budget.

Record the protocol revisions and SDK versions you depend on in the ADR, and revisit it when a new revision deprecates something you use.

## When to choose it

Write a tools ADR when a product's model first gets tools, when it connects to systems owned by other teams or companies, and when the number of tools or their context cost grows past what fits comfortably in a request. Supersede it when you add a mechanism (the first A2A partner, the first MCP gateway) or when evals show tool selection degrading.
