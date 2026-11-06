# Vector Search

Keyword search finds documents that contain the query's words. **Vector search** finds documents whose *meaning* is close to the query's, even when they share no words: "my card was charged twice" can find a passage about "duplicate payments". It is the default retriever of most RAG systems, and also the one most often used without understanding its failure modes.

## Embeddings

An **embedding model** maps a text to a vector of fixed length (its **dimension**, commonly a few hundred to a few thousand numbers). Training pushes texts with similar meaning toward similar directions. Two rules follow:

- **Compare only vectors from the same model and version.** A vector from model A and one from model B live in different spaces; comparing them returns numbers that mean nothing. Changing the embedding model means re-embedding the whole corpus.
- **Embed documents once, at ingestion.** At query time you embed only the query. Embedding the corpus per query multiplies cost and latency by the corpus size.

Constela Mission's `embed()` is a deterministic bag-of-words stand-in: texts that share words point in similar directions. It does not understand synonyms, which keeps tests exact; the mechanics of indexing, scoring and filtering are the same as with a real model.

## Cosine similarity

Similarity between two vectors is usually the **cosine of the angle** between them:

```ts
cosine(a, b) = dot(a, b) / (length(a) × length(b))   // from -1 to 1
```

1 means the same direction, 0 unrelated, negative opposed. Many embedding models return **unit vectors** (length 1); then cosine equals the dot product, which is cheaper. Some stores offer dot product or Euclidean distance instead; on normalized vectors all three produce the same ranking.

## Top-k and thresholds

A search scores the query against candidates, sorts by score and keeps the **top k**. Vector search *always* returns k results, even for a question your corpus cannot answer: the nearest neighbors of nonsense are still neighbors. A **minimum score** turns "the closest passages" into "the relevant passages", and an empty result is a signal to the answer step (lesson 06) to say "I don't know". Calibrate the threshold on real queries; raw cosine values differ a lot between models.

## Metadata filters

Real queries come with constraints: this product, this plan, documents updated recently, and above all this tenant. Two ways to apply a filter:

| | Pre-filter (filter, then rank) | Post-filter (rank, then filter) |
| --- | --- | --- |
| Result size | always up to k matching results | can return fewer than k, or none |
| Correctness | only matching items are ever scored | non-matching items crowd out matching ones |
| Cost in big indexes | needs filter-aware index support | cheap but lossy |

Post-filtering the top 10 for "plan = Scale" may leave one result, or zero, although twenty Scale passages exist. Production vector stores implement filtered search inside the index for this reason. For permissions, pre-filtering is not an optimization but a requirement (lesson 08).

## From a loop to an index

The challenge scores every record: exact (**brute-force**) search, fine up to tens of thousands of vectors. Beyond that, stores use **approximate nearest neighbor (ANN)** indexes: **HNSW** (a navigable graph of neighbors, fast and memory-hungry) or **IVF** (vectors grouped in clusters, only the nearest clusters scanned). ANN trades a little recall for orders of magnitude of speed; measure that recall with lesson 07's metrics.

## Pitfalls

- Mixing vectors from two embedding models (or two dimensions) in one index.
- No threshold, so irrelevant passages reach the prompt and invite hallucinated answers.
- Post-filtering, then wondering why filtered queries return almost nothing.
- Forgetting updates: a re-added document must replace its old vector, not sit next to it.
- Expecting embeddings to match exact identifiers (error codes, SKUs): that is keyword search's strength (lesson 04).

Vector search is offered by dedicated vector stores, by extensions of relational databases and by search engines with vector fields. HNSW is the most widely used ANN index. Many embedding models support truncating a vector to fewer dimensions with a small quality loss. Compare embedding models on your own data rather than on a public leaderboard.

## When to choose it

Use vector search when users phrase questions in their own words and documents use other words for the same thing: support questions, policies, product docs, multilingual corpora with a multilingual model. Start with brute force in memory or pgvector next to your existing data; move to a dedicated store when the corpus or the query rate outgrows it. Combine it with keyword search when queries contain identifiers, codes or rare names (lesson 04), and always pair it with a threshold and pre-filtering.
