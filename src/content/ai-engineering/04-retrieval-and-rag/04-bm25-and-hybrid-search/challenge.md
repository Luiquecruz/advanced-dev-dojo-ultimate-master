Implement keyword search with BM25, fuse rankings with Reciprocal Rank Fusion and combine several retrievers into a hybrid search. `tokenize(text)` is given: it lowercases, splits into words, drops stopwords and stems lightly (`refunds` and `refunded` both become `refund`). Use it for documents and queries alike.

## 1. `createBm25Index(documents, { k1 = 1.2, b = 0.75 })`

`documents` is a list of `{ id, text }`. With `N` documents, `n(t)` the number of documents that contain token `t`, `tf` the count of `t` in a document, `|D|` the document's token count and `avgdl` the average token count:

```
idf(t)      = ln(1 + (N - n(t) + 0.5) / (n(t) + 0.5))
score(D, Q) = Σ over the unique tokens t of Q of  idf(t) × tf × (k1 + 1) / (tf + k1 × (1 - b + b × |D| / avgdl))
```

The index has three operations:

- **`idf(term)`**: the idf of the first token of `tokenize(term)` (so `idf('plans')` is the idf of `plan`). A token no document contains has `n(t) = 0`.
- **`score(query, id)`**: the BM25 score of the document with that id. A repeated query token counts once.
- **`search(query, topK = 10)`**: every document with a score above 0, as `{ id, score }`, sorted from the highest score to the lowest (ties keep document order), at most `topK`.

## 2. `reciprocalRankFusion(rankings, { k = 60, topK })`

`rankings` is a list of rankings, each a list of ids from best to worst. Each id's fused score is the sum, over the rankings that contain it, of `1 / (k + rank)`, where `rank` is its position starting at 1. If an id appears more than once in one ranking, only its first position counts. Return `{ id, score }` sorted from the highest score to the lowest; ties keep the order in which ids first appear (reading the first ranking, then the second, ...). Return at most `topK` results (no limit when it is missing).

## 3. `hybridSearch(query, retrievers, { candidates = 20, topK = 5, k = 60 })`

A retriever is a function `(query, limit)` that returns a list of ids, or a promise of one. Call every retriever with `(query, candidates)`, in parallel, and fuse the rankings of those that succeed with `reciprocalRankFusion` using `k` and `topK`. A retriever that throws or rejects is skipped; if every retriever fails, reject with an error.
