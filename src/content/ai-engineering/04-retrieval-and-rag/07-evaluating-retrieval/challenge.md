Measure retrieval on its own, before any answer is generated: implement recall@k, reciprocal rank and nDCG@k, run a retriever over a golden set and compare retrievers in one report. The demo uses your functions to compare BM25-only, vector-only and hybrid retrieval on the Brightdesk handbook.

A **golden item** is `{ query, relevance }`, where `relevance` maps passage ids to a grade: `3` answers the query, `1` is related, `0` (or absent) is not relevant. The **relevant ids** of an item are those with a grade above 0.

Every metric reads the retrieved list **without repeated ids**: keep only the first occurrence of each id, then take positions from that list.

## 1. `recallAtK(retrieved, relevant, k)`

The number of `relevant` ids that appear in the first `k` retrieved ids, divided by the number of relevant ids. Throw an error when `relevant` is empty (a golden item without a relevant id is a bug in the golden set).

## 2. `reciprocalRank(retrieved, relevant)`

`1 / position` of the first retrieved id that is relevant (positions start at 1), or `0` when none is. The mean of this value over queries is the **MRR**.

## 3. `ndcgAtK(retrieved, relevance, k)`

```
DCG  = Σ over positions i = 1..k of  (2^grade(i) - 1) / log2(i + 1)
nDCG = DCG of the first k retrieved ids / DCG of the ideal list
```

`grade(i)` is the grade of the id at position `i` (0 for ids not in `relevance`). The ideal list is the grades above 0 sorted from highest to lowest, cut to `k`. Return `0` when the ideal DCG is 0.

## 4. `evaluateRetriever(retrieve, goldenSet, { k = 5 })`

`retrieve(query, limit)` returns a list of ids or a promise of one. For each golden item in order, call `retrieve(item.query, k)` and compute the item's recall@k, reciprocal rank and nDCG@k. Return:

```ts
{ k, recallAtK, mrr, ndcgAtK, perQuery: [{ query, retrieved, recall, reciprocalRank, ndcg }] }
```

where the three top-level metrics are the means over the golden set and `retrieved` is the list the retriever returned.

## 5. `compareRetrievers(retrievers, goldenSet, { k })`

`retrievers` maps names to retrievers. Evaluate each one with `evaluateRetriever` and return one row per retriever, `{ name, k, recallAtK, mrr, ndcgAtK }`, sorted by `ndcgAtK` from highest to lowest.
