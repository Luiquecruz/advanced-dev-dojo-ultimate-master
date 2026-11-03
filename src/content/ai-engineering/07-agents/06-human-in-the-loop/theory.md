# Human-in-the-Loop

Some actions should not depend on a model's judgment alone: moving money, deleting data, emailing a customer, merging to production. Budgets stop runaway loops; **approval gates** stop a single wrong action. The engineering problem is not asking the question, it is pausing a run that may wait hours for an answer and resuming it correctly.

## Which actions need a human

Classify tools by what a wrong call costs:

| Tool kind | Example | Gate |
| --- | --- | --- |
| Read-only | look up an order, search docs | none |
| Reversible write | draft a reply, add a label | usually none; log it |
| Bounded write | refund up to $50 | none below a threshold, approval above |
| Irreversible or external | refund $5 000, delete an account, send an email | always ask |

Approval can depend on the **arguments**, not only the tool: `requiresApproval: (args) => args.amount > 50`. Gating every call creates **approval fatigue**: reviewers click "approve" without reading, and the gate protects nothing. Gate what is risky, and make the rest cheap to undo.

## Pause before acting

The gate sits between parsing a tool call and executing it. A pending call has done nothing yet, so denying it is free. Safe calls in the same response can run immediately; only the risky ones wait.

```ts
if (needsApproval(tool, args)) state.pending.push({ toolCallId: call.id, name: call.name, arguments: args });
else state.messages.push({ role: 'tool', toolCallId: call.id, content: await execute(tool, args) });
```

## Interrupt with serializable state

A reviewer may answer in two minutes or tomorrow morning. Holding a promise open that long fails: the server restarts, the deploy rolls, the request times out. Instead the run **returns** an interrupt: a status, the pending calls and everything needed to continue, as **plain JSON**.

```ts
{ status: 'interrupted', pending: [{ toolCallId, name: 'refund', arguments: { orderId: 'A-77', amount: 240 } }], state: { messages, steps, pending } }
```

Store the state (a database row, a file, a queue message), show the pending calls in a review UI, and resume when a decision arrives, possibly in another process. Keep functions, class instances and secrets out of the state: tools are supplied again on resume, and credentials come from the environment, not from a stored conversation.

## Resume with a decision

Each pending call gets one decision, and each decision becomes a tool result the model reads:

- **Approve:** run the call as proposed; the model sees the real result.
- **Deny:** do not run it; the model sees "Denied: <reason>" and can choose another path or explain to the user. A good reason ("recipient not on the allowlist") steers the next step.
- **Edit:** run the call with the human's arguments (refund $120 instead of $240); tell the model what changed so its final answer matches what actually happened.

Every tool call id must end up with exactly one result, or the next request is malformed. Refuse to resume when a decision is missing rather than guessing.

## Designing the review

- Show the reviewer **what will happen**, in domain terms ("refund $240 to ana@example.com"), plus the context that led there.
- Record who decided what and when; approvals are audit evidence (module 13).
- Set an expiry: a pending refund nobody reviews for three days should be cancelled, not executed late.
- Watch the approval rate. Near 100% means the gate is too wide or the reviewers stopped reading; near 0% means the agent is proposing the wrong things.

## Pitfalls

- Asking for approval after the side effect ("I refunded you, OK?").
- Blocking a thread or an HTTP request while a human decides.
- Storing tool functions, credentials or class instances in the saved state.
- Gating every call, so reviewers rubber-stamp.
- Losing the decision context: the model never learns why a call was denied or edited.

> **Status as of October 2026:** frameworks ship this pattern under their own names. LangGraph pauses a graph with `interrupt()` and resumes it with a `Command` carrying the human's answer, using a checkpointer to persist state. The OpenAI Agents SDK marks tools with `needsApproval`, returns pending `interruptions`, and serializes a run with `RunState` to resume after `approve` or `reject`. The Claude Agent SDK asks a permission callback before each tool use. MCP's elicitation feature lets a server request input from the user through the client.

## When to choose it

Add approval gates for irreversible, external or expensive actions, and for any action whose mistakes reach customers before a human could notice. Prefer argument-based gates over tool-wide ones, and prefer making actions reversible (drafts, soft deletes, holds) over gating them. Skip gates on read-only tools and on fully automated batch flows where a verifier, not a person, is the right check.
