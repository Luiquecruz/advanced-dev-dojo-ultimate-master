# Query Rewriting and Reranking

Retrieval quality is set at two moments: before the search, by what you search *for*, and after it, by how you *order* what came back. Users type "money back?" while the handbook says "refunds for annual plans". A model can bridge that gap on both sides, as long as the pipeline keeps working when the model does not cooperate.

## The query side

**Query rewriting** turns the user's words into better search queries: expand abbreviations, add the product's vocabulary, remove chit-chat, and in a conversation resolve "and for the Scale plan?" into a standalone question using the history.

**Multi-query** asks a model for several rewrites, searches with each and pools the results (usually fused with RRF, lesson 04). Different phrasings hit different passages, which raises recall. Always keep the original question in the list: a bad rewrite should add candidates, never replace the user's intent.

**HyDE** (Hypothetical Document Embeddings) asks the model to *write a plausible answer* and searches with that text. A fake answer looks more like the real passage than the question does ("Refunds reach the original card within..." vs "money back?"), so its embedding lands closer. The hypothetical text is never shown to the user and may contain invented details; it only steers the search. Combine it with the question so the search keeps the user's words.

**Decomposition** splits compound questions ("Do annual plans get refunds and can I keep SSO after downgrading?") into sub-questions retrieved separately; **routing** picks the right index or tool for a query (handbook, API docs, ticket history).

Every query-side step costs one model call before the search even starts, so it adds latency to every request. Use a small, fast model, cache rewrites of frequent questions, and measure that recall really improves.

## The ranking side

First-stage retrievers (BM25, vectors) compare a query with documents encoded **independently**; that is what makes them fast over millions of items. A **reranker** looks at the query and one candidate **together** and outputs a relevance score. It is far more accurate and far too slow for the whole corpus, so it runs on the top 20 to 100 candidates:

```
retrieve 50 (hybrid) → rerank → keep top 5 → prompt
```

Rerankers come in three forms: **cross-encoders** (small transformer models that read query and passage together), hosted **rerank APIs**, and **LLM rerankers** that score candidates from a prompt. An LLM reranker is the easiest to start with and the most fragile: its output is text you must parse.

## Reranking defensively

A model-scored reranker asks for JSON such as `{"scores": [{"id": "billing-refund-timing", "score": 9}]}`. Expect every failure:

- **Malformed JSON**: wrapped in prose and a code fence, trailing commas, single quotes, or truncated. Recover what you can; give up cleanly on the rest.
- **Missing scores**: the model skipped candidates. Keep them, after the scored ones, in retrieval order.
- **Invented ids**: the model scored a passage you never sent. Ignore it.
- **Invalid values**: `"high"`, `42` on a 0–10 scale, duplicates. Ignore them, keep the first valid score.
- **Refusals, errors, timeouts**: reranking is an improvement, not a dependency. Fall back to the retrieval order and record that the reranker was skipped.

```ts
const { results, reranked } = await rerank(model, query, candidates, { topK: 5 });
if (!reranked) metrics.increment('rerank.fallback');
```

The fallback rule is what makes the feature safe to ship: the worst case is the quality you had without a reranker, never an error page.

## Pitfalls

- Replacing the user's question with a rewrite, so a bad rewrite loses the intent.
- Showing HyDE text to the user, or treating it as evidence.
- Reranking only the top 5: the reranker can only promote what was retrieved.
- Throwing on a malformed reranker reply, turning an optional step into an outage.
- Adding three model calls per query without measuring recall gains against the added latency and cost.

Hosted rerank APIs and open cross-encoder models are common choices, and vector databases increasingly bundle reranking. Reranking on top of hybrid search reduces retrieval failures further in published results. HyDE is the name of the hypothetical-document technique from the research literature.

## When to choose it

Add **query rewriting** in conversational interfaces (follow-up questions must become standalone) and when users and documents use different vocabularies. Add **multi-query** or **HyDE** when your golden set shows recall misses on short or vague questions, and only if the added latency fits the budget. Add a **reranker** as soon as you retrieve more candidates than you put in the prompt; it is usually the single largest precision gain. Prefer a dedicated cross-encoder or rerank API for latency and cost at scale, an LLM reranker for prototypes or when you need reasoning over the passages, and always keep the retrieval order as the fallback.
