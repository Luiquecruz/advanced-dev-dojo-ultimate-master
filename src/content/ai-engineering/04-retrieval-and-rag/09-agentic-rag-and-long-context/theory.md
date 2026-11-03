# Agentic RAG and Long Context

The pipeline built so far is **fixed**: every question triggers one retrieval, with one query, and the answer is generated from whatever came back. Two developments push against that design. **Agentic RAG** lets a model decide when, what and how often to retrieve. **Long context** windows make it possible to skip retrieval and send whole documents. Both are useful; neither makes the fundamentals obsolete.

## Agentic RAG

In agentic RAG, retrieval is a **tool** in an agent loop (module 07). The model can:

- **decide whether to retrieve at all** ("hello" needs no search; "what is our refund policy" does);
- **choose the source**: the handbook index, the ticket history, a SQL database, the web;
- **reformulate and iterate**: search, read, notice a gap, search again with a better query;
- **decompose** multi-hop questions ("which plan includes SSO, and can it be refunded after 40 days?") into sub-searches;
- **check sufficiency** before answering, and stop with "not found" when the evidence is not there.

Research variants formalize parts of this: Self-RAG trains a model to decide when to retrieve and to critique its own use of the passages; Corrective RAG grades retrieved passages and falls back to another source when they are poor.

The price is the price of any agent: **more model calls, more latency, less predictability**. A three-step search loop can cost several times a single retrieval and take seconds longer; it can also loop on a question the corpus cannot answer. Agentic RAG therefore needs the same controls as any agent: a step budget, a token or cost budget, a stop rule ("answer, or say not found, after at most N searches"), and traces you can inspect. Permission filtering (lesson 08) still lives inside the search tool, never in the agent's instructions.

## Long context instead of retrieval

When the whole knowledge base fits in the context window, you can **send all of it**. For a small, stable corpus this is attractive: no chunking, no index, no retrieval misses, and prompt caching (module 02) makes repeated large prefixes cheaper and faster.

The limits are real:

- **Cost and latency scale with input.** Sending 500 pages on every question costs far more than five retrieved passages, even with caching discounts.
- **Context rot.** Models use long inputs unevenly. "Lost in the middle" (2023) showed facts in the middle of a long context are used worse than facts at the edges; later studies showed accuracy dropping as input grows even on simple tasks, and sharply when the question and the answer share few words. A window that *accepts* a million tokens does not *use* them equally well.
- **No permission boundary.** Everything in the context is visible to the model, so per-user access means per-user context, which is retrieval again.
- **Corpora grow.** A knowledge base that fits today may not fit next year, and most enterprise corpora never fit.

Studies comparing the two find that long context can match or beat RAG on average quality when given enough compute, while RAG stays far cheaper; **routing** between them (answer with retrieval, fall back to long context when the model judges the passages insufficient) captures much of both.

## Choosing

| Situation | Approach |
| --- | --- |
| Small, stable, single-audience corpus (a few hundred pages) | long context with prompt caching |
| Large or growing corpus, per-user permissions, citations required | RAG |
| Simple factual questions at high volume | fixed RAG pipeline (cheap, predictable) |
| Multi-hop questions, several sources, research tasks | agentic RAG with budgets and a stop rule |
| "Summarize themes across all documents" | GraphRAG or map-reduce summaries (module 05) |
| Whole document analysis (one contract, one codebase file) | long context for that document, retrieved by RAG |

These combine: retrieve the right *documents*, then read them whole with long context.

> **Status as of October 2026:** several frontier models accept context windows of around one million tokens. Chroma's "Context Rot" report (July 2025) tested 18 models and found performance growing less reliable as input length grows. NoLiMa (2025) found that 11 of 13 long-context models fell below half their short-context score at 32K tokens when lexical overlap was removed. Anthropic's Contextual Retrieval guidance suggests knowledge bases under about 200 000 tokens can simply be included in the prompt with caching.

## When to choose it

Start with a fixed RAG pipeline: it is cheap, predictable and measurable with lesson 07's metrics. Move to **agentic RAG** when your evals show multi-hop or multi-source questions failing with single-shot retrieval, and only with budgets, stop rules and traces. Use **long context** when the corpus is small, stable and visible to every user, or to read a few documents that retrieval already selected. Re-evaluate the choice when context prices or windows change; keep the decision in your RAG ADR.
