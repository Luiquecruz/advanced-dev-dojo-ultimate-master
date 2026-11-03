# Checkpoint: the Multi-Agent ADR

This module built the pieces of multi-agent systems: an orchestrator with parallel workers, handoffs between peers, a shared blackboard, defenses against cascading errors and runaway delegation, and the protocols for agents you do not own. The checkpoint asks the question that should come first: **does this product need more than one agent, feature by feature?** You answer it as an Architecture Decision Record plus a **multi-agent plan** precise enough to implement and review.

The ADR is not "we will use framework X with five agents". It is a measured comparison, a choice per feature, and the limits that keep the chosen design inside its budget.

## The decision checklist

1. **Measure before choosing.** Run the candidate architectures on the same golden tasks (module 10 formalizes this) and record quality, cost per task and latency. A pilot table beats intuition: designs that look elegant often lose on cost.
2. **Decide per feature.** Breadth-first features with independent parts (research, comparisons) often favor orchestrator-workers. Coupled work (editing one document, changing one codebase) usually favors a single agent. One product can need both.
3. **Make the limits agree.** Worst-case cost = planner attempts + synthesis + maximum workers, and it must fit the budget. Concurrency must respect the provider's rate limit. Delegation depth must stop workers from spawning workers.
4. **Contain failures.** Validate worker outputs (shape and citations) before synthesis, decide what a failed worker means (a listed gap, or abort), and set the minimum share of successful workers for a usable result.
5. **Choose the protocol per boundary.** Your own agents in one deployment: in-process. Quick capabilities with schemas: MCP. Long, stateful work by an agent another organization runs: A2A.

| Option | Buys | Costs |
| --- | --- | --- |
| Single agent | lowest cost, one context, easy debugging | limited breadth, slower on parallelizable work |
| Orchestrator-workers | breadth, parallel speed, isolated contexts | a token multiplier, plan and synthesis failure modes |
| Handoff swarm | specialists with separate tools and permissions | loops, unpredictable cost, hard debugging |

## Writing the ADR well

- **Context** carries the numbers: requirements, pilot results, budgets, incidents.
- **Decision** is one "We will" sentence covering both features and the key limits.
- **Alternatives** are the architectures someone will propose again ("just use one agent", "a swarm is more flexible"), each with the measurement that rules it out.
- **Consequences** are honest: a multi-agent feature costs several times more per task and needs budget monitoring; caps on workers trade depth for cost.

## Example: a support-insights feature

```ts
export const adr = {
  id: 9,
  title: 'Summarize weekly support themes with one agent',
  status: 'accepted',
  layer: 'loop',
  context: 'Weekly summaries of 2,000 tickets must cost under $3 and pass 85% of rubric checks. A five-worker pilot passed 87% at $11; one agent with clustering in code passed 86% at $1.20.',
  decision: 'We will use one agent over clusters computed in code, and revisit multi-agent only if ticket volume exceeds one context window after clustering.',
  alternatives: [{ option: 'Five parallel workers, one per product area', reason: 'One point of quality for nine times the cost.' }],
  consequences: { positive: ['Cheap, debuggable, one trace per run.'], negative: ['Very large weeks may need sampling.'] },
};
```

## Pitfalls

- Choosing an architecture before measuring it on your own tasks.
- One architecture for every feature.
- Worker caps and budgets that do not agree, or a concurrency above the provider limit.
- No rule for failed workers, so one failure sinks the run or silently disappears.
- A2A between agents deployed in the same service, or a tool interface for a partner's multi-day process.

> **Status as of October 2026:** published multi-agent gains (such as Anthropic's 90.2% over a single agent on its internal research evaluation) and token multipliers (about 15× chat for its multi-agent system) come from specific tasks and model generations. Use them to decide what to measure, not as your numbers.

## When to choose it

Write this ADR before adding a second agent to any feature, when the pilot numbers change (a new model generation can make a single agent good enough), and after incidents such as runaway delegation or a cost spike. Supersede it per feature, so the record shows why each feature has the architecture it has.
