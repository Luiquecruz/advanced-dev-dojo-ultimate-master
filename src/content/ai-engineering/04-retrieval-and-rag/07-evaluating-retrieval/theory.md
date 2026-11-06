# Evaluating Retrieval

A RAG answer can fail in two places: retrieval did not bring the right passage, or the model did not use it well. If you evaluate only final answers, every failure looks the same and every fix is a guess. Evaluate **retrieval on its own**, with numbers, before you touch prompts or models.

## The golden set

A golden set is a list of queries with the passages that *should* come back:

```ts
{ query: 'How long until a refund reaches my card?', relevance: { 'billing-refund-timing': 3, 'billing-refund-window': 1 } }
```

- **Queries** come from real users when possible (search logs, support tickets), plus hard cases you know about: exact codes, vague questions, questions the corpus cannot answer.
- **Relevance grades** say how useful each passage is: `3` answers the question, `1` is related context, absent means irrelevant. Graded labels let metrics reward the best passage more than a merely related one.
- **Size**: start with 30 to 50 queries; grow toward hundreds from production failures. A dozen queries is enough to catch a broken pipeline, not to choose between two good ones.

Label against **document ids that survive re-chunking** (or re-label when chunking changes), or the golden set silently rots.

## The metrics

**recall@k**: of the relevant passages, how many are in the top k?

```
recall@k = |relevant ∩ top k| / |relevant|
```

Set `k` to what you actually send to the model. If recall@5 is 60%, four in ten relevant passages never reach the prompt, and no prompt engineering will bring them back.

**MRR** (mean reciprocal rank): for each query, `1 / position` of the first relevant result (0 if none), averaged. It rewards putting *one* good answer near the top: ideal for "find the policy" style questions.

**nDCG@k** (normalized discounted cumulative gain) handles graded relevance and position together:

```
DCG@k  = Σ (2^grade(i) - 1) / log2(i + 1)     for positions i = 1..k
nDCG@k = DCG@k / DCG@k of the ideal ordering
```

The gain rewards highly relevant passages; the logarithmic discount says position 1 matters more than position 5; dividing by the ideal ordering puts every query on a 0 to 1 scale. Some libraries use `grade` instead of `2^grade - 1` as the gain; state which one you use, because the numbers differ.

**precision@k** (share of the top k that is relevant) matters when irrelevant context is costly: it fills the prompt and misleads the model.

| Metric | Question it answers |
| --- | --- |
| recall@k | did the evidence reach the prompt? |
| MRR | how far down is the first useful result? |
| nDCG@k | is the best material on top, with credit for related material? |
| precision@k | how much noise did we send? |

## Using the numbers

1. **Compare variants on the same set with the same k**: BM25-only, vector-only, hybrid, hybrid plus reranker, two chunk sizes, two embedding models.
2. **Read per-query results**, not only the mean. A change that wins on average can break your most important queries.
3. **Gate changes**: store the report, and fail CI when recall or nDCG drops beyond noise (module 10 builds the gate).
4. **Then evaluate generation** separately: faithfulness (are claims supported by the cited sources?), answer relevance, citation accuracy. Libraries and LLM judges help there; retrieval metrics are plain arithmetic.

## Pitfalls

- Evaluating only final answers, never retrieval.
- A golden set written by the person who built the retriever, from the documents' own wording, which flatters keyword search.
- Measuring recall@20 while sending 5 passages to the model.
- Comparing numbers computed with different k, different gain formulas or different golden sets.
- Never adding production failures to the golden set.

Public retrieval benchmarks report nDCG@10 as the headline metric. RAG evaluation libraries add generation metrics such as faithfulness and context precision, mostly computed with LLM judges.

## When to choose it

Build a golden set before you tune anything in a RAG pipeline: chunk size, embedding model, hybrid weights, rerankers and query rewriting are all choices that only a retrieval eval can settle. Use recall@k as the gate when the model reads everything you send, nDCG@k or MRR when order matters (short context budgets, users reading results), and keep a few unanswerable queries to check that thresholds return nothing. Re-run the eval on every retrieval change and whenever documents change in bulk.
