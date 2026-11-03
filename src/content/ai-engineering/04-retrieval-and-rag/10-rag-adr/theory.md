# Checkpoint: the RAG ADR

This module built a retrieval pipeline piece by piece: chunkers, a vector index, BM25 and fusion, query rewriting and reranking, grounded answers, retrieval metrics and permission filtering. The checkpoint turns those pieces into one decision: an **Architecture Decision Record** for the context layer of a real feature, plus a **retrieval plan** an engineer could implement and an auditor could check.

A RAG decision is never "we use a vector database". It is a set of linked choices, each justified by a measured number or a hard rule.

## The decision checklist

Work from hard constraints to soft ones.

1. **Access and isolation.** Who may see which documents? Multi-tenancy and internal-only content are hard constraints: they decide that filtering happens inside the search, before ranking, and whether tenants share an index (with a mandatory tenant filter) or get their own.
2. **Freshness.** How fast must an edit, unpublish or deletion stop being served? A contractual "5 minutes" rules out nightly batches and requires event-driven updates plus a reconciliation job.
3. **Latency and cost of the retrieval stage.** Rerankers and query rewriting cost milliseconds and money on every request. Budget them before choosing.
4. **Quality on your golden set.** Pick the metric that matches how the answer is built (recall@k with k equal to the passages in the prompt) and choose among the variants that pass, using measurements, not intuition.
5. **Grounding behavior.** Citations required or not, and what happens without evidence: refuse, hand off to a human, or (rarely) answer from general knowledge with a warning.
6. **The eval gate.** Which metric and target block a retrieval change in CI, on which golden set.

| Choice | Typical options | Decided by |
| --- | --- | --- |
| Chunking | fixed, recursive, structure-aware | document format, golden set |
| Retrieval | vector, BM25, hybrid with RRF | query types (codes, names), golden set |
| Reranker | none, cross-encoder, LLM | recall gap vs latency and cost budget |
| Permissions | before ranking (always), tenant filter or index per tenant | access rules, tenant size, regulation |
| Freshness | event-driven, batch | contractual or legal deadlines |
| No evidence | refuse, hand off | product and risk |

## Reading an eval table

A table of measured variants is the heart of the record. Apply the hard limits first (latency, cost), then the quality target, and choose the simplest surviving row; record the most tempting rejected rows as alternatives with the number that ruled them out. A variant that wins on quality but breaks the latency budget is not "almost acceptable": it is out, and the ADR says why so nobody re-proposes it next quarter without new numbers.

## Example: an internal policy assistant

```ts
export const retrievalPlan = {
  chunking: { strategy: 'structure-aware', size: 1200, overlap: 150 },
  retrieval: 'hybrid',
  fusion: 'rrf',
  reranker: 'none',
  candidates: 30,
  topK: 6,
  permissionFilter: 'before-ranking',
  tenantIsolation: 'tenant-filter',
  freshness: { mode: 'event-driven', maxLagMinutes: 15 },
  citations: 'required',
  noEvidence: 'refuse',
  evaluation: { metric: 'recall@6', target: 0.85, goldenSetSize: 150 },
};
```

Here a single company is one tenant, policies have numbered headings, the measured hybrid variant already met recall@6 without a reranker, and a refusal is acceptable because employees can ask HR directly. Each value points back to a fact.

## Pitfalls

- Choosing a vector database before measuring retrieval variants.
- Enforcing permissions "in the prompt" or after ranking.
- A freshness promise with no mechanism (or a nightly batch behind a 5-minute promise).
- An eval metric that does not match the prompt (recall@20 when the prompt holds 5 passages).
- Only positive consequences: hybrid search and rerankers add services to run and keep in sync.

> **Status as of October 2026:** managed vector stores and search engines commonly support hybrid search with RRF, metadata filtering and per-tenant partitions out of the box; hosted rerankers typically add tens to a few hundred milliseconds per query. Verify current latencies and prices for your candidates before writing them into a plan.

## When to choose it

Write the RAG ADR when a feature first retrieves context for a model, and supersede it when the corpus changes shape (new document types, a jump in size), when access rules change (new tenants, internal content), when a freshness promise is added, or when a new retriever, embedding model or reranker beats the current one on your golden set. Keep the eval table in the record: it is the evidence that makes the decision reviewable.
