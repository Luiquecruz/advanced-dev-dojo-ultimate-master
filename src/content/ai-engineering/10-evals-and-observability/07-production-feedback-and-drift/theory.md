# Production Feedback and Drift

Offline evals answer "is this version good enough to ship?" on a dataset you chose. Production asks a different question every day: "is it still good, for the users we actually have?" The inputs change, the provider changes, your documents change, and the dataset slowly stops representing reality. This lesson covers the loop that keeps evals honest after release: online evaluation, user feedback, drift detection and sampling for human review.

## Offline and online evaluation

| | Offline | Online |
| --- | --- | --- |
| Data | curated golden dataset | live traffic |
| When | before release (Regression Gates) | continuously after release |
| Ground truth | expected answers, labels | usually none: proxies, judges, feedback |
| Catches | regressions you anticipated | regressions you did not, and drift |

Online techniques, from safest to most direct:

- **Online scorers:** run cheap code-based checks (schema validity, refusal rate, citation present, guardrail hits) on every response, and LLM judges on a sample, writing scores onto the trace.
- **Shadow traffic:** the candidate runs on copies of real requests; its outputs are scored but never shown to users.
- **Canary and A/B tests:** a small share of users gets the candidate; compare business metrics (resolution rate, escalations, conversion), not only model scores.

## Feedback from users

**Explicit feedback** (thumbs, ratings, "report a problem") is easy to collect and hard to read: few users click, and those who do are mostly unhappy or delighted. Treat it as a signal to sample, not as a quality metric.

**Implicit feedback** is plentiful and often more honest:

| Signal | Usually means |
| --- | --- |
| user regenerates or rephrases immediately | the answer missed |
| user edits the draft heavily before sending | partial value |
| user copies the answer, or accepts the suggestion | value |
| conversation escalates to a human or a ticket is reopened | failure on the task |
| user abandons mid-flow | friction or wrong direction |

Record every signal **with the trace id** of the response it refers to. Feedback that cannot be joined to its trace says that something was bad, never what.

## Drift: what changes under you

| Kind | Example | Detect with |
| --- | --- | --- |
| **Input drift** | a product launch brings questions the dataset never had; a new market brings a new language | topic, language and length distributions over time; embedding clusters with no nearby eval cases |
| **Model drift** | the provider updates the snapshot behind an alias, or retires one | pinned versions; a scheduled run of the offline suite against production settings |
| **Prompt and config drift** | someone edits the live prompt in a management UI | versions in every trace (Prompts as Code), alerts on version changes |
| **Knowledge drift** | policies and documents change; the index serves stale passages | freshness of indexed documents, retrieval metrics on recent questions |
| **Concept drift** | what counts as correct changes: the refund window moves from 30 to 14 days | dated labels; re-labeling the dataset when rules change |

Watch output statistics too: refusal rate, finish reasons, response length, tool error rate, cost per conversation and online scores, each compared with a baseline window. A refusal rate that doubles overnight with no deploy is a provider change until proven otherwise.

## Sampling for review

Human review is the ground truth, and it is scarce. Spend it deliberately:

- **Random sample:** a small, uniform share of traffic. The only sample that gives unbiased quality estimates.
- **Stratified sample:** fixed quotas per slice (language, feature, customer tier), so small slices are not drowned out.
- **Triggered sample:** traces with negative feedback, low judge scores, guardrail hits, errors or unusually long trajectories. Rich in failures, which is the point, but **biased**: never compute a quality rate from it.

Size the sample to the review capacity (a queue nobody empties is worse than a smaller one), give reviewers written guidelines, and **filter for privacy before** anything enters a dataset: redact personal data, respect consent and retention. Reviewed failures become new golden cases, labeled disagreements recalibrate the judge (LLM as Judge), and the next regression gate runs on a dataset that looks like today's traffic. That loop is often called the **data flywheel**.

## Pitfalls

- Shipping with offline evals only and learning about drift from support tickets.
- Reading thumbs-down rates as quality, ignoring who clicks.
- Feedback stored without trace ids.
- Quality rates computed from triggered samples.
- Copying raw production conversations, personal data included, into eval datasets.

Observability platforms offer online evaluators on sampled traces, feedback APIs tied to trace ids and annotation queues for human review. Studies have measured large behavior changes in the same API model name within a few months, the classic argument for pinned snapshots and scheduled re-evaluation.

## When to choose it

Instrument feedback and online scorers before launch, not after the first incident: they need traces to attach to and a baseline window to compare with. Run cheap code-based scorers on all traffic, judges on a sample, and a random review sample sized to your reviewers. Add shadow traffic or A/B tests when a change is too risky or too subjective for offline evals alone, and schedule the offline suite against production settings so provider-side changes surface even when you deploy nothing.
