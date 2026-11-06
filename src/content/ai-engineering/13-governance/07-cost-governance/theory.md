# Cost Governance

Module 01 taught you to estimate the cost of one call, and module 07 to cap one agent run. Cost governance works one level up: across every team, feature and agent in the company, **who may spend how much on AI, who is warned before a limit, and who pays?** Token spend behaves unlike most infrastructure: it scales with usage, a single prompt change can double it, and an agent stuck in a loop can burn a month's budget in an afternoon.

## Attribution first

You cannot govern a number you cannot split. Every model call should carry its **cost owner**: at least a team and a feature, often also the agent identity (lesson 04), the environment and the customer tier. The gateway attaches these as metadata and records the provider's actual usage per call:

```text
team=support feature=summaries agent=support-agent model=acme-small-2026-05 cost=$0.00041
```

From that, finance gets **showback** (each team sees its spend) or **chargeback** (each team's budget pays), and engineering gets **unit economics**: cost per resolved ticket, per generated report, per active user. Unit costs are what decide whether a feature is viable, and whether a cheaper model or a cache (module 02's caching and batching) is worth it.

## Budgets in layers

Budgets nest from wide to narrow:

| Budget | Protects against |
| --- | --- |
| Company-wide per month | total exposure, the number finance signed off |
| Per team | one team consuming everyone's allocation |
| Per feature | one runaway feature or experiment |
| Per run or per agent (module 07) | one loop going wrong |

A call is checked against **every** budget that matches it, and each budget blocks only its own scope: an exhausted summaries budget stops summaries, not the support team's replies.

## Soft limits, hard limits, alerts

- **Soft thresholds** (50%, 80%) alert the owner while there is still time to act: switch models, add a cache, ask for more budget. Each threshold alerts once; repeated alerts teach people to ignore them.
- The **hard limit** refuses calls that would exceed the budget. Decide it **before** the call with an upper bound: input tokens are known, output is capped by `maxTokens`, so the worst case is computable.
- **Record actual usage after** the call. Estimates guard the door; actual costs fill the ledger.

What happens at the hard limit is a product decision: refuse with a clear message, degrade to a cheaper model, or queue for batch processing. Decide it per feature, never by accident.

## Rate limits

Budgets react to totals; **rate limits** react to bursts. A per-team or per-agent limit (requests per window) stops a retry storm or a looping agent within seconds, protects shared provider quotas, and keeps one team from exhausting the organization's rate limit at the provider. Tell callers when to retry, as providers do with `retryAfterMs` (module 01).

## Where it runs

Put cost controls in the **gateway** that every call passes, not in each application: one place to attach metadata, check budgets, apply rate limits and record usage. Applications still set `maxTokens`, choose models deliberately and cache; the gateway makes sure the sum stays within what the company agreed to spend.

## Pitfalls

- Total spend known only from the provider's monthly invoice.
- Budgets without owners, or alerts sent to a channel nobody watches.
- Hard limits checked after the call: the money is already spent.
- One shared key for all teams, which makes attribution impossible (lesson 03).
- Counting only model calls and forgetting embeddings, reranking, evals and tool APIs.

Prices per token tend to fall for a given capability while total spend usually rises with adoption and agentic workloads, so budgets and attribution matter more than any one price.

## When to choose it

Attribute cost from the first production call: metadata is cheap to add early and painful to reconstruct. Add team and feature budgets with soft alerts when more than one team ships AI features or monthly spend becomes a line item finance asks about; add hard limits and rate limits as soon as an agent or an automated job can call models without a human in the loop.
