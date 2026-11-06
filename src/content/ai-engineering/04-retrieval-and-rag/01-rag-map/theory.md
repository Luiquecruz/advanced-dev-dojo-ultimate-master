# Map: Retrieval and RAG

Models know what was in their training data, up to a cutoff, and nothing about your handbook, your customers' tickets or yesterday's policy change. **Retrieval-Augmented Generation (RAG)** closes that gap at request time: find the passages that answer the question, put them in the context, and have the model answer from them with citations. It is the most widely deployed pattern in AI engineering, and most of its quality lives outside the model.

## The question this module answers

> How do we give a model the right knowledge, for this user, at the moment of the question, and prove that it used it?

That splits into smaller questions, one per lesson: how to cut documents, how to find passages by meaning and by exact words, how to improve the query and the ranking, how to force grounded answers, how to measure retrieval, and how to keep it from leaking documents across users.

## Layer

RAG is **layer 2, context**: it decides what the model sees on each call. It touches the others constantly. Retrieval quality is checked by **evaluation** (layer 5), permission filtering is **governance** (layer 6) enforced in code, agentic RAG turns retrieval into a **loop** (layer 4), and a good retriever often lets you use a smaller **model** (layer 1).

## Prerequisites

- Module 01: calling a model through your own wrapper, tokens and cost, handling malformed output and failures.
- Module 02: prompt anatomy and context budgets (context rot, ordering).
- TypeScript, async functions and basic data structures (maps, sorting).

## The pipeline you will build

```
ingestion:  documents → chunk (02) → embed + index (03, 04) with tenant and ACL (08)
query:      question → rewrite (05) → hybrid search (04) → permission filter (08) → rerank (05)
answer:     numbered sources → grounded answer with validated citations, or refuse (06)
measure:    golden set → recall@k, MRR, nDCG for each variant (07)
```

## The path

1. **Chunking**: fixed, recursive and Markdown-aware chunkers with overlap and metadata.
2. **Vector search**: an in-memory index, cosine top-k, thresholds and metadata filters.
3. **BM25 and hybrid search**: keyword ranking and Reciprocal Rank Fusion.
4. **Query rewriting and reranking**: multi-query, HyDE and a model-scored reranker that survives bad output.
5. **Grounded answers and citations**: numbered sources, citation validation, refusing without evidence.
6. **Evaluating retrieval**: recall@k, MRR and nDCG on a golden set; the vector vs BM25 vs hybrid report.
7. **Permission-aware retrieval**: tenants, ACLs, updates and deletions.
8. **Agentic RAG and long context** (quiz): when an agent should drive retrieval, and when to skip retrieval entirely.
9. **The RAG ADR**: a retrieval plan for a multi-tenant help center, checked against a briefing.

Every challenge runs on Constela Mission's deterministic `embed()` (a bag-of-words stand-in for an embedding model) and the fake model, so the mechanics are exact and repeatable; the quality numbers of real embedding models belong to your own evals.

> **Status as of October 2026:** RAG is `established`; GraphRAG (module 05) is established for global questions over large corpora; agentic RAG and contextual retrieval are widely used and still evolving. Frontier context windows reach around a million tokens, which changes when RAG is needed but not why (lesson 09).

## When to choose it

Choose RAG when answers must come from knowledge the model does not have or must not guess: private documents, frequently changing facts, anything that needs a citation, anything with per-user access. Choose plain prompting when the knowledge is small and stable enough to fit in the prompt, fine-tuning (module 11) when you need a behavior or format rather than facts, and a knowledge graph (module 05) when questions are about relationships across many documents. Read this module in order: each lesson's output is the next one's input.
