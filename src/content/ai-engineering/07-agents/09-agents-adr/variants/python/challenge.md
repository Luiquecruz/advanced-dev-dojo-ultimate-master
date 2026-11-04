Write the agent ADR and the agent spec for **Resolve**, the refund assistant of a marketplace's support team.

## Briefing

Customers open tickets such as "my parcel never arrived" or "I was charged twice". Today a human agent investigates and, when the policy allows it, refunds the customer.

- **Volume:** about 4 000 refund tickets a day.
- **Pilot:** on the same 300 labeled tickets, a fixed workflow (look up the order, check the policy, refund or decline) resolved **41%**, because tickets need between 2 and 14 lookups (tracking, payments, seller messages) depending on what each lookup reveals. An agent prototype resolved **83%**.
- **Prototype traces:** successful agent runs took a median of **6 steps**, a p95 of **11 steps** and a maximum of **16 steps**. One step (model call plus tool) costs about **$0.006** and takes about **2 seconds**. In **3%** of runs the agent requested the same tracking lookup more than five times in a row.
- **Targets:** at most **$0.15** and **3 minutes** of agent time per ticket (human waiting time excluded).
- **Finance policy:** refunds are irreversible. Refunds **above $50** need the approval of a support lead; smaller refunds may be issued directly.
- **Operations:** a lead may take up to **24 hours** to approve; workers are redeployed several times a day. The payment API and the messaging API both accept **idempotency keys**.
- **Escalation:** a ticket the agent cannot finish goes back to the human queue with the conversation attached.

Tool catalog:

| Tool | Effect | Notes |
| --- | --- | --- |
| `get_order` | read | order, items, seller, amounts |
| `get_tracking` | read | carrier events |
| `get_payment` | read | charges and previous refunds |
| `read_policy` | read | the refund policy |
| `issue_refund` | write, money, irreversible | accepts an idempotency key |
| `send_message` | write, reaches the customer | accepts an idempotency key |
| `ban_seller` | write, destructive | owned by the trust and safety team |
| `run_sql` | read and write any table | for analysts |

## Task

In `adr.py`, define two module-level dicts. Keys keep the same camelCase names as the JSON contract (`"maxSteps"`, `"stuckRepeatLimit"`, `"checkpointEveryStep"`).

**`ADR`**, the record:

- `"id"`: a positive integer; `"title"`: at least 10 characters; `"status"`: `"accepted"`; `"layer"`: `"loop"`.
- `"context"`: at least 80 characters; mentions steps (or the pilot), cost or budget, and approval or a human.
- `"decision"`: at least 40 characters, starts with `We will`.
- `"alternatives"`: a list of at least two `{"option": ..., "reason": ...}` dicts with distinct options (at least 3 characters) and reasons of at least 20 characters.
- `"consequences"`: `{"positive": [...], "negative": [...]}`, each with at least one item of at least 15 characters.

**`AGENT_PLAN`**, the spec:

- `"pattern"`: `"workflow"`, `"agent"` or `"hybrid"` (a workflow with an agentic stage).
- `"goal"`: at least 20 characters.
- `"tools"`: tool names from the catalog that the agent receives.
- `"approvals"`: a list of `{"tool": ..., "rule": ...}`; `"rule"` (at least 10 characters) says when a human must approve.
- `"budget"`: `{"maxSteps", "maxCostUsd", "maxDurationMs"}`.
- `"stuckRepeatLimit"`: how many identical consecutive tool calls stop the run.
- `"onBudgetExhausted"`: `"retry"`, `"close_ticket"` or `"handoff_to_human"`.
- `"durability"`: `{"checkpointEveryStep", "idempotentTools"}`.
- `"failureModes"`: at least three `{"failure": ..., "mitigation": ...}` with distinct failures (at least 15 characters) and mitigations of at least 20 characters.

The spec must be coherent with the briefing:

1. The pilot rules out a fixed workflow: `"pattern"` is `"agent"` or `"hybrid"`.
2. Least privilege: `"tools"` are catalog names, include everything a refund needs (`get_order`, `get_tracking`, `get_payment`, `read_policy`, `issue_refund`, `send_message`) and nothing the task does not need.
3. `issue_refund` has an approval whose rule names the $50 threshold; every approval is for a tool in `"tools"`, and no read-only tool is gated.
4. `"maxSteps"` lets the p95 successful run finish (at least 11) and stays at most 25; `"maxCostUsd"` is at most $0.15 and covers `"maxSteps"` steps at $0.006 each; `"maxDurationMs"` is at most 3 minutes and covers `"maxSteps"` steps at 2 seconds each.
5. `"stuckRepeatLimit"` is an integer from 2 to 5.
6. A ticket that exhausts a budget goes to a human: `"onBudgetExhausted"` is `"handoff_to_human"`.
7. Runs survive redeploys during 24-hour approvals: `"checkpointEveryStep"` is `True` and every write tool in `"tools"` is in `"idempotentTools"`.

The tests check structure and coherence, not your wording.
