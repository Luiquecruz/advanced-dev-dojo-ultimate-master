Start with the architectures. For each feature, go through the three pilot rows and keep the one whose pass rate, cost and p95 all meet that feature's requirements. Exactly one row survives per feature.
---
For the orchestrator, write the worst case down: `maxPlanAttempts × 0.20 + 0.40 + maxWorkers × 0.50 ≤ budgetUsd ≤ 5`. Incident 1 needs a second planner attempt, so two attempts cost $0.40 and leave room for at most 8 workers. Concurrency cannot exceed the provider limit of 4.
---
Each remaining incident maps to one field: workers spawning workers sets `maxDelegationDepth` to 1, the invented citation requires `'citations'` (plus `'schema'` for the shape), and the failed scan becomes `onWorkerFailure: 'continue'` with `minSuccessfulShare: 0.5`.
---
For the integrations, ask what is on the other side: a fast structured lookup (MCP), a partner's agent working for days and asking for documents (A2A), or your own workers in the same service (in-process). Write the ADR last, citing the pilot numbers that rule out each alternative.
