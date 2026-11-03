Start with the plan and go through the briefing line by line. The pilot numbers (41% versus 83%, 2 to 14 lookups) decide the pattern. The catalog's "Notes" column tells you which tools a refund does not need.
---
For the budget, compute the bounds first: `maxSteps` between 11 and 25; `maxCostUsd` at least `maxSteps × 0.006` and at most 0.15; `maxDurationMs` at least `maxSteps × 2 000` and at most 180 000. Choosing `maxSteps` near the maximum successful run (16) leaves room for hard tickets while keeping cost well under the target.
---
Approvals gate write tools only, and the refund rule must mention the $50 threshold. Every write tool you keep (`issue_refund`, `send_message`) goes into `idempotentTools`, and `checkpointEveryStep` is `true` because approvals can outlive several deploys.
---
Write the ADR from the plan: the context restates the pilot, the per-step costs, the per-ticket targets and the approval rule; the decision is one "We will..." sentence; each rejected alternative (fixed workflow, approve everything, give it `run_sql`, unlimited steps) cites the fact that ruled it out.
