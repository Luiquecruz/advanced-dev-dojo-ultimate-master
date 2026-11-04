Write the evaluation ADR for **Replywise**, the reply assistant of a helpdesk product.

## Briefing

Replywise drafts replies to customer tickets for human support agents. It runs as an agent on `atlas-mini-2026-07-15` (provider **Atlas**) with three tools: `get_order`, `issue_refund` (automatic up to **$50**) and `escalate_to_human`. Every draft is JSON: `{"reply", "category", "actions"}`.

- **Volume:** **40 000** drafts a week.
- **Critical scenarios:** a refund above $50 must be escalated, never issued (`refund-over-limit`); the reply must state the exact refunded amount (`refund-amount`); an account deletion request goes to a human (`account-deletion-request`).
- **Available data:** **400** resolved tickets with the reply a human approved, and **120** drafts that two senior agents labeled pass or fail.
- **Noise:** three A/A runs of the current prompt on the 400 tickets moved the pass rate by up to **2.5 points**, and single runs flipped several cases.
- **Product rule:** a change may lower the pass rate by at most **5 points**, and never break a critical scenario.
- **CI budget:** at most **$15** per pull request run. One case run costs **$0.01** (draft plus judge).
- **Privacy:** tickets contain names, emails and addresses. Traces are exported to an external observability vendor.
- **Review capacity:** two reviewers can label **300** traces a week in total.
- **Feedback:** agents can click thumbs down on a draft, and the product records when an agent rewrites most of a draft before sending it.
- **History:** last quarter, a provider update behind a `-latest` alias doubled the refusal rate for three days before anyone noticed.

Candidate judges, measured on the 120 labeled drafts:

| Judge model | Provider | Cohen's kappa vs the senior agents |
| --- | --- | --- |
| `atlas-pro-2026-05-20` | Atlas | 0.81 |
| `nimbus-mid-2026-08-01` | Nimbus | 0.74 |
| `vega-small-2026-03-01` | Vega | 0.48 |

Catalogs: scorer kinds `exact`, `regex`, `schema`, `semantic`, `judge`, `trajectory`; online triggers `thumbs-down`, `draft-rewritten`, `low-judge-score`, `guardrail-hit`, `forbidden-call`, `model-error`; drift alerts `refusal-rate`, `response-model-change`, `cost-per-ticket`, `online-score-drop`, `input-language-mix`.

## Task

In `adr.py`, define two module-level dicts. Keys keep the same camelCase names as the JSON contract (`"criticalCases"`, `"pullRequestCases"`).

**`ADR`**, the record:

- `"id"`: a positive integer; `"title"`: at least 10 characters; `"status"`: `"accepted"`; `"layer"`: `"evaluation"`.
- `"context"`: at least 80 characters; mentions regressions, the gate or the baseline, and personal data or privacy.
- `"decision"`: at least 40 characters, starts with `We will`.
- `"alternatives"`: a list of at least two `{"option": ..., "reason": ...}` dicts with distinct `"option"` texts (at least 3 characters) and a `"reason"` of at least 20 characters.
- `"consequences"`: `{"positive": [...], "negative": [...]}`, each a list with at least one item of at least 15 characters.

**`EVAL_PLAN`**, the plan:

- `"dataset"`: `{"cases", "criticalCases"}`: the number of golden cases and the ids of the critical scenarios.
- `"scorers"`: a list of `{"name", "kind", "checks"}`: a unique `"name"`, a `"kind"` from the catalog and `"checks"` (at least 15 characters) saying what it verifies.
- `"judge"`: `{"model", "minKappa", "pairwiseBothOrders"}`.
- `"gate"`: `{"pullRequestCases", "repeats", "tolerance", "blockOnCriticalRegression", "projectedCostUsd"}`: the cases run on each pull request, the runs per case, the allowed drop of the pass rate (a fraction: `0.03` is 3 points), and the projected cost of one pull request run.
- `"tracing"`: `{"conventions", "captureContent"}`.
- `"online"`: `{"randomSampleRate", "triggeredPerWeek", "triggers"}`: the share of all drafts sampled at random for review, the weekly cap of triggered samples, and the triggers.
- `"drift"`: `{"scheduledSuite", "alerts"}`: `"daily"`, `"weekly"` or `"never"`, and alerts from the catalog.

Use `True`/`False` for the flags and plain numbers (not bools) for counts, rates and costs.

The plan must be coherent with the briefing:

1. The dataset has at least the 400 resolved tickets and lists the three critical scenario ids.
2. Scorers cover the JSON shape (`schema`), the refund and escalation rules (`trajectory`) and open qualities (`judge`).
3. The judge is from the table, reaches a kappa of at least 0.7, comes from a different provider than the generator, `"minKappa"` is at least 0.7, and pairwise comparisons run in both orders.
4. The gate repeats each case at least 3 times; its tolerance is above the 2.5-point noise and at most the 5-point product rule; it blocks critical regressions; `"pullRequestCases"` is at most the dataset's `"cases"`; `"projectedCostUsd"` is within 10% of `pullRequestCases × repeats × $0.01` and at most $15.
5. Tracing uses `"opentelemetry-genai"` and does not capture content.
6. Review fits capacity: `"randomSampleRate"` is above 0 and `randomSampleRate × 40 000 + triggeredPerWeek` is at most 300. Triggers come from the catalog, include `forbidden-call` and at least one feedback signal.
7. The offline suite runs on a schedule, and drift alerts include `response-model-change` and `refusal-rate`.

The tests check structure and coherence, not your wording.
