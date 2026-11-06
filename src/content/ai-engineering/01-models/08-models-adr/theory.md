# Checkpoint: the Model ADR

This module looked at models from the outside: how they behave, what a call costs and how long it takes, which families exist, how to survive failures and why leaderboards decide less than your own measurements. The checkpoint turns that into the first entry of your AI engineering portfolio: an **Architecture Decision Record** for the model layer of a concrete feature, plus a **model plan** that a teammate could implement and an on-call engineer could debug.

A model ADR is rarely "we use the best model". It is a small system: a primary model, a rule for when to escalate, a fallback in another failure domain, pinned versions and a cost projection, each justified by a fact.

## The decision checklist

Work through the constraints from hardest to softest. Hard constraints remove candidates; soft ones rank what is left.

1. **Data and compliance.** Where may the data be processed? Which providers have a contract that allows it? A model that cannot legally see the data is out, however good it is.
2. **Latency.** What is the p95 budget for the user-facing path? Remember that an escalation adds the second model's latency to the first.
3. **Quality.** Which candidates reach the target on *your* eval set (lesson 07)? A cheap model below the target can still be the primary if a validator catches its failures and escalation fixes them.
4. **Cost.** Project the monthly bill: volume × cost per call of the primary, plus the escalation rate × cost of the stronger model, plus fixed costs (self-hosted GPUs are paid whether used or not).
5. **Availability.** Which model answers when the primary's provider is down? It must sit in another failure domain and still meet the hard constraints, with a quality floor you accept during an outage.
6. **Change.** Pin dated snapshots, record deprecation dates, and decide what triggers a review: a new snapshot, a price change, an eval regression.

| Option | Buys | Costs |
| --- | --- | --- |
| One frontier model | best quality, simplest code | price, latency, one failure domain |
| One small model | speed and price | quality ceiling, more failures to handle |
| Cheap-first cascade | most of the quality at a fraction of the cost | a validator to maintain, added latency on escalation |
| Self-hosted open weights | data control, fixed cost, pinned forever | operating GPUs, fixed cost even when idle |

## Writing the ADR well

- **Context** lists the forces with numbers: volume, latency budget, quality target, budget, data rules, availability needs. A reader should be able to disagree with your decision using the same facts.
- **Decision** is one sentence starting with "We will", naming the primary, the escalation rule and the fallback.
- **Alternatives** are the options someone will propose later ("just use the best model", "self-host everything"), each with the fact that rules it out.
- **Consequences** have two sides. Positive: what the team gains. Negative: what it now pays or must watch, such as "the validator becomes a critical component" or "outage traffic runs at lower accuracy".

## Example: an internal policy assistant

```ts
export const adr = {
  id: 1,
  title: 'Answer HR policy questions with a mid-tier model and retrieval',
  status: 'accepted',
  layer: 'model',
  context:
    'About 2 000 questions a day from employees, answered in a chat where a 4 s p95 latency is acceptable. Policies change monthly. Answers must cite the policy text. The budget is $300 a month and data may be processed by our approved vendor only.',
  decision: 'We will use a pinned mid-tier snapshot from the approved vendor with retrieved policy excerpts, and fall back to the same snapshot in a second region.',
  alternatives: [
    { option: 'Frontier model', reason: 'Evals show no quality gain on cited policy answers at four times the cost.' },
    { option: 'Fine-tuned small model', reason: 'Policies change monthly, so knowledge baked into weights would go stale.' },
  ],
  consequences: {
    positive: ['Costs stay near $120 a month with room for growth.'],
    negative: ['A vendor-wide outage takes the assistant down; accepted because it is internal and not critical.'],
  },
};
```

Each rejected alternative points back to a fact in the context. The data rule allows one vendor only, so the fallback cannot leave it; the negative consequence records that accepted risk instead of hiding it.

## Pitfalls

- Choosing by leaderboard rank instead of measured quality, latency and cost.
- Forgetting that escalation latency adds up, or that fixed hosting costs count.
- A fallback from the same provider as the primary.
- Aliases such as `-latest` in the plan, so behavior changes without a deploy.
- Only positive consequences.

Providers deprecate dated snapshots on published schedules and retire them after a notice period. Keep the pinned snapshot ids and their retirement dates in the ADR so a deprecation triggers a review.

## When to choose it

Write a model ADR when a feature first calls a model in production, when its volume, latency budget or data rules change, and when a new candidate (a new snapshot, a cheaper tier, an open-weight release) beats the current choice on your evals. Supersede the record instead of editing it, so the history of model decisions stays readable.
