# Checkpoint: the Agent ADR

This module went from "who decides the next step" to an agent that is bounded, supervised and durable. The checkpoint turns it into the next entry of your portfolio: an **Architecture Decision Record** for the loop layer of a concrete product, plus an **agent spec** a teammate could implement and an on-call engineer could reason about at 3 a.m.

An agent ADR is never "we will use an agent". It is a set of answers, each tied to a fact: why not a workflow, which tools and why only those, which calls need a human, which limits stop a run and what happens then, what survives a crash, and which failures you expect.

## The decision checklist

1. **Pattern.** Can code decide the next step? Use the pilot: if a fixed workflow handles most cases, build it (lesson 02). An agent, or a hybrid with an agentic stage, needs evidence that the number of steps varies with what the run discovers.
2. **Goal and done criteria.** One sentence the agent can be judged against, ideally with a verifiable end state (refund issued or declined with a reason, customer informed).
3. **Tools, least privilege.** Start from the task, not from the catalog. Every tool you add is a new way to fail or be abused; a tool the task does not need (an analyst's SQL console, a destructive admin action) stays out even if "it might help".
4. **Approval points.** Gate irreversible and external actions, by tool and by arguments (lesson 06). Leave read-only tools ungated, or reviewers drown and stop reading.
5. **Budgets and stop rules.** Steps from traces (at least the p95 of successful runs), cost and wall time from the product's targets, stuck detection from observed repetition, and a defined outcome when a budget ends (lesson 05).
6. **Durability.** If runs outlive a process (human waits, long tasks, frequent deploys), checkpoint every step and make every side-effecting tool idempotent (lesson 07).
7. **Failure modes.** List what will go wrong (loops, crashes, injected instructions in tool results, promises the agent cannot keep) and the mechanism that contains each one.

## Coherence is the point

Each number must be consistent with the others. A step limit of 16 at $0.006 per step needs a cost cap of at least $0.096, or the cost cap fires first and the step limit is decoration. A 3-minute time target at 2 seconds per step allows at most 90 steps, so the step limit is the binding constraint, as it should be. A 24-hour approval wait with deploys several times a day makes durability mandatory, not optional. Write these checks down; the tests of this checkpoint do exactly that.

## Example: an internal docs assistant

```ts
export const agentPlan = {
  pattern: 'agent',
  goal: 'Answer engineering questions from the internal docs, citing the pages used.',
  tools: ['search_docs', 'read_page'],
  approvals: [],
  budget: { maxSteps: 8, maxCostUsd: 0.05, maxDurationMs: 30000 },
  stuckRepeatLimit: 3,
  onBudgetExhausted: 'return_partial_with_sources',
  durability: { checkpointEveryStep: false, idempotentTools: [] },
  failureModes: [{ failure: 'Answers without reading any page', mitigation: 'Reject answers with no citation and retry once.' }],
};
```

No approvals and no durability, and that is correct: the tools are read-only, runs last seconds, and rerunning from scratch is free. The same checklist gives a very different spec for a refund agent.

## Pitfalls

- Choosing an agent because it is fashionable, with no evidence a workflow fails.
- Granting every tool in the catalog "just in case".
- Approval on everything, or on nothing.
- Budgets that contradict each other or the product's targets.
- No defined outcome when a budget is exhausted.
- Durability assumed ("the server rarely restarts") instead of designed.

> **Status as of October 2026:** agent SDKs and workflow engines provide most of these mechanisms as configuration (turn limits, approval hooks, checkpointers, durable workflows), under different names. The ADR records your decisions in their terms, so it survives a change of framework.

## When to choose it

Write an agent ADR before an agent first touches production data or money, when its tools, budgets or approval rules change, and when a trace review shows a new failure mode. Supersede the record instead of editing it, so the history of why the agent may do what it does stays readable for reviewers and auditors.
