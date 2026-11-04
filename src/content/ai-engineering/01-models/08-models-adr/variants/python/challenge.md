Write the model ADR for **Triage**, the automatic ticket triage of a helpdesk product.

## Briefing

When a support agent opens a ticket, Triage shows one of 12 categories and a priority, computed by a model when the ticket arrives.

- **Volume:** 60 000 tickets a day, so 1 800 000 a month.
- **Latency:** the triage must be ready within **1 500 ms p95**, including any escalation (the latencies of a primary call and an escalation call add up).
- **Quality:** at least **92%** of tickets correctly classified on the 300-ticket labeled eval set.
- **Budget:** at most **$4 000 a month** for model calls and model hosting.
- **Privacy:** tickets contain customer personal data. Contracts require processing **in the EU**.
- **Availability:** triage must keep working when one provider is down. During an outage, accuracy may drop to **88%**.
- **Pilot findings:** a validator rejects an answer when the category is not one of the 12 or the reported confidence is below 0.7. The rejection rate per model is in the table. Escalating rejected answers to a model with at least 92% accuracy brings the combined accuracy to at least 92%.

Candidates, measured on the eval set with the production prompt:

| Model id | Tier | Provider | Region | p95 latency | Cost per 1 000 tickets | Accuracy | Rejected by validator |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `atlas-mini-2026-07-15` | small | Atlas | EU | 400 ms | $0.50 | 89% | 15% |
| `atlas-pro-2026-05-20` | frontier | Atlas | EU | 2 600 ms | $9.00 | 96% | 2% |
| `atlas-think-2026-06-02` | reasoning | Atlas | EU | 11 000 ms | $30.00 | 97% | 1% |
| `nimbus-mid-2026-08-01` | mid | Nimbus | EU | 1 000 ms | $2.50 | 94% | 3% |
| `vega-flash-2026-04-10` | mid | Vega | US only | 700 ms | $1.20 | 93% | 4% |
| `tern-14b-q4` | small, open weights | self-hosted | EU | 900 ms | $0 per call, $1 500 a month fixed | 91% | 9% |

Every provider also offers `-latest` aliases (`atlas-mini-latest`, `nimbus-mid-latest`, ...) that move to new snapshots without notice.

## Task

In `adr.py`, define two module-level dicts. Keys keep the same camelCase names as the JSON contract (`"escalationRule"`, `"projectedMonthlyUsd"`).

**`ADR`**, the record:

- `"id"`: a positive integer.
- `"title"`: at least 10 characters.
- `"status"`: `"accepted"`.
- `"layer"`: `"model"`.
- `"context"`: at least 80 characters; mentions latency, cost or budget, and the EU or privacy.
- `"decision"`: at least 40 characters, starts with `We will`.
- `"alternatives"`: a list of at least two `{"option": ..., "reason": ...}` dicts with distinct `"option"` texts (at least 3 characters) and a `"reason"` of at least 20 characters.
- `"consequences"`: `{"positive": [...], "negative": [...]}`, each a list with at least one item of at least 15 characters.

**`MODEL_PLAN`**, the plan:

- `"primary"`: the model id that answers every ticket first.
- `"escalation"`: the model id that answers when the validator rejects the primary's answer, or `None` for no escalation.
- `"escalationRule"`: at least 20 characters describing when to escalate; it must name a mechanical check (mention validation, the category list, or confidence).
- `"fallback"`: the model id that answers instead of the primary when the primary's provider is down.
- `"projectedMonthlyUsd"`: your projected monthly cost: `1 800 × (primary cost per 1 000 + primary rejection rate × escalation cost per 1 000)`, plus the fixed monthly cost of every self-hosted model in the plan. Calls served by the fallback during outages are not projected.

The plan must be coherent with the briefing:

1. Every model id comes from the table (pinned snapshots, never a `-latest` alias).
2. Every chosen model processes data in the EU, and the fallback's provider differs from the primary's.
3. Primary p95 plus escalation p95 (if any) is at most 1 500 ms; the fallback's p95 is at most 1 500 ms.
4. The primary reaches 92% accuracy, or the escalation model does; the fallback reaches at least 88%.
5. The projection is within 10% of the formula above and at most $4 000.

The tests check structure and coherence, not your wording.
