Start with the plan. Cross out every table row that breaks a hard limit: p95 above 400 ms or cost above $1.00 per 1 000 queries. From what is left, keep the rows with recall@5 of at least 0.90. Your `chunking.strategy`, `retrieval` and `reranker` must be one of those rows.
---
The other plan fields follow from single sentences of the briefing: the prompt holds 5 passages (`topK`), rerankers score the top 50 (`candidates`), hybrid rows use RRF (`fusion`), deletions within 5 minutes rule out a nightly batch, every answer cites, and no evidence means a human takes over.
---
Write the ADR from the plan: the context restates the forces with their numbers (tenants, access, 5 minutes, 400 ms, $1.00, 0.90 on 400 queries), the decision is one "We will..." sentence, and each rejected alternative (vector-only, hybrid without a reranker, the LLM reranker, nightly re-indexing) cites the number that ruled it out.
