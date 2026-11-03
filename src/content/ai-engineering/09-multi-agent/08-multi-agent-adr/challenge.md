Write the multi-agent ADR for **Scoutline**, a vendor-research assistant for procurement teams.

## Briefing

Scoutline has two features:

- **`market-scan`**: "compare these vendors on pricing, compliance and integrations". A scan covers 4 to 12 vendors; each vendor can be researched independently. The output is a report with citations.
- **`report-editing`**: the user asks for changes to an existing report ("shorten the summary", "use a formal tone"). Every edit can touch the whole document.

**Pilot** on 60 golden tasks per feature (rubric pass rate, average cost per task, p95 latency):

| Feature | Architecture | Pass rate | Cost per task | p95 latency |
| --- | --- | --- | --- | --- |
| market-scan | `single-agent` | 0.64 | $0.90 | 11 min |
| market-scan | `orchestrator-workers` | 0.86 | $3.70 | 4 min |
| market-scan | `handoff-swarm` | 0.71 | $5.40 | 13 min |
| report-editing | `single-agent` | 0.92 | $0.25 | 40 s |
| report-editing | `orchestrator-workers` | 0.81 | $1.10 | 70 s |
| report-editing | `handoff-swarm` | 0.78 | $1.60 | 95 s |

**Requirements:** a pass rate of at least **0.80** for both features. Market scan: at most **$5** per scan and a p95 of at most **6 minutes**. Report editing: at most **$0.50** per edit and a p95 of at most **60 seconds**.

**Orchestrator costs** (per scan): each planner attempt about **$0.20**, the synthesis about **$0.40**, each worker about **$0.50**. The model provider allows at most **4 concurrent requests** per scan.

**Pilot incidents:**

1. In 3% of runs the planner's JSON was unusable; those scans failed.
2. A worker cited a pricing page it had never been given; the invented price reached the final report.
3. Workers spawned their own sub-workers that searched the same pages, tripling the cost of some scans.
4. When one worker failed, the whole scan failed, although the other vendors' findings were fine. Product wants the report delivered with the gaps listed, unless fewer than half of the workers succeeded.

**Integrations:**

- `vendor-database`: an internal service returning structured rows for a vendor name in under a second.
- `certifyhub-compliance`: an external partner's agent that verifies certifications; a check takes up to 2 days and may ask for documents.
- `research-workers`: Scoutline's own workers, deployed in the same service as the orchestrator.

## Task

In `adr.ts`, export two constants.

**`adr`**, the record:

- `id`: a positive integer; `title`: at least 10 characters; `status`: `'accepted'`; `layer`: `'loop'`.
- `context`: at least 80 characters; mentions cost (or budget), and quality (pass rate or quality) or latency.
- `decision`: at least 40 characters, starts with `We will`.
- `alternatives`: at least two `{ option, reason }` entries with distinct `option` texts (at least 3 characters) and a `reason` of at least 20 characters.
- `consequences`: `{ positive, negative }`, each a list with at least one item of at least 15 characters.

**`multiAgentPlan`**, the plan:

- `architectures`: `{ 'market-scan': ..., 'report-editing': ... }`, each `'single-agent'`, `'orchestrator-workers'` or `'handoff-swarm'`.
- `orchestrator: { maxWorkers, concurrency, maxPlanAttempts, budgetUsd }` for the market scan.
- `limits: { maxDelegationDepth }`: how deep delegation may go below the orchestrator (1 means workers cannot delegate).
- `validation`: checks applied to worker outputs before synthesis, from `'schema'`, `'citations'`, `'llm-judge'`.
- `failurePolicy: { onWorkerFailure, minSuccessfulShare }`: `'continue'` or `'abort'`, and the share of workers that must succeed for a report to be delivered.
- `integrations`: `{ 'vendor-database': ..., 'certifyhub-compliance': ..., 'research-workers': ... }`, each `'in-process'`, `'mcp'` or `'a2a'`.

The plan must be coherent with the briefing:

1. Each feature uses the architecture that meets every requirement in the pilot table.
2. The worst-case scan cost (every planner attempt, the synthesis and `maxWorkers` workers) fits `budgetUsd`, and `budgetUsd` is at most $5; `maxWorkers` is at least 2; `concurrency` is at least 2, at most the provider limit and at most `maxWorkers`; the plan survives an unusable plan with a second attempt.
3. Workers cannot delegate; outputs are checked for shape and for citations before synthesis.
4. A failed worker does not sink a scan, and a report needs at least half of the workers to succeed.
5. Each integration uses the protocol that fits it.

The tests check structure and coherence, not your wording.
