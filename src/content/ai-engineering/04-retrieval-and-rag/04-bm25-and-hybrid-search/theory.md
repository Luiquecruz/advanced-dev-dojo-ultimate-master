# BM25 and Hybrid Search

Vector search is good at meaning and bad at exact strings. Ask it for "error E-4012", "SKU 88-1402" or a customer's surname and the nearest neighbors may be passages about errors in general. Keyword search has the opposite profile. **Hybrid search** runs both and fuses the rankings, and in most published comparisons it beats either one alone.

## BM25

**BM25** (Best Matching 25) is the standard keyword ranking function, used by Lucene, Elasticsearch, OpenSearch and most search engines for decades. For a query and a document, it adds up one contribution per query term:

```
score(D, Q) = Σ over unique terms t in Q of  idf(t) × tf × (k1 + 1) / (tf + k1 × (1 - b + b × |D| / avgdl))

idf(t) = ln(1 + (N - n(t) + 0.5) / (n(t) + 0.5))
```

Three ideas are packed in there:

- **Rare terms weigh more (idf).** `N` is the number of documents and `n(t)` how many contain the term. "plan" appears everywhere and says little; "4012" appears once and says almost everything. This variant of idf (Lucene's) stays positive even for terms in every document.
- **Term frequency saturates (k1).** `tf` is how often the term appears in the document. The second mention matters, the tenth barely does: the fraction approaches `k1 + 1` as `tf` grows. `k1` (usually 1.2 to 2.0) sets how fast it saturates; a larger value lets repetition count longer.
- **Long documents are normalized (b).** `|D|` is the document length and `avgdl` the average. With `b = 1`, a match in a long document counts less than the same match in a short one; with `b = 0`, length is ignored. The default `0.75` sits in between.

Defaults of `k1 = 1.2` and `b = 0.75` work well; tune them only with a golden set (lesson 07).

BM25 needs a **tokenizer**: lowercase, split into words, drop stopwords, and often stem ("refunds", "refunded" → "refund"). The query and the documents must use the same one, and identifiers need care: "E-4012" becomes "e" and "4012", which still matches exactly.

## Why combine

| Query | BM25 | Vectors |
| --- | --- | --- |
| "error E-4012" | finds the one passage with the code | may return generic error passages |
| "my card was charged twice" | misses "duplicate payment" | finds it by meaning |
| "SSO" vs "single sign-on" | misses unless synonyms are configured | usually matches |
| a customer name or ticket id | exact | unreliable |

The two retrievers fail on different queries, so their union recovers what each one misses.

## Reciprocal Rank Fusion

BM25 scores are unbounded and depend on the corpus; cosine scores live between -1 and 1 and depend on the embedding model. Adding or averaging them is meaningless without careful normalization. **Reciprocal Rank Fusion (RRF)** ignores scores and uses only ranks:

```
rrf(d) = Σ over rankings r of  1 / (k + rank_r(d))      // rank starts at 1, k = 60
```

- A document ranked first in one list gets `1/61 ≈ 0.0164`.
- A document ranked third in **both** lists gets `2/63 ≈ 0.0317`: agreement beats a single strong vote.
- A document missing from a list simply gets nothing from it.
- `k` dampens the difference between top ranks; 60 comes from the original paper and is the default in most engines.

```ts
reciprocalRankFusion([
  ['inbox-forwarding', 'billing-seats'], // BM25
  ['security-sso', 'inbox-forwarding'],  // vectors
]);
// inbox-forwarding first: both retrievers found it
```

The usual pipeline fetches a generous **candidate** list from each retriever (20 to 100), fuses, and passes the top of the fused list to a reranker (lesson 05) or straight to the prompt. Running the retrievers in parallel keeps latency near the slower one, and a retriever that fails should degrade the result, not break it.

Some engines offer **weighted** fusion (a convex combination of normalized scores) as an alternative; it can beat RRF when tuned on a golden set, and loses when the score distributions shift.

## Pitfalls

- Fusing raw scores from different retrievers.
- Different tokenizers at index and query time, so exact codes stop matching.
- Too few candidates per retriever: fusion can only reorder what was retrieved.
- Dropping BM25 because "embeddings understand everything": exact identifiers say otherwise.

> **Status as of October 2026:** Elasticsearch, OpenSearch, Weaviate, Qdrant, Vespa, Azure AI Search and others offer built-in hybrid search, most with RRF; PostgreSQL setups combine full-text search with pgvector. Learned sparse models (such as SPLADE) are a third retriever family that expands terms with a model while keeping an inverted index.

## When to choose it

Add BM25 next to vectors whenever queries contain identifiers, codes, product names, people or rare terms, which is almost every support, legal and technical corpus. Use RRF as the default fusion: no tuning, no score normalization, robust to retriever changes. Stay with vectors only for short, conversational corpora where your evals show BM25 adds nothing, and with BM25 only when you cannot run an embedding model or the queries are all exact lookups.
