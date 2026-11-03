Build an in-memory vector index for the Brightdesk handbook: embed passages at ingestion, rank them by cosine similarity to a query, filter by metadata before ranking and drop weak matches. The passages are in `corpus.ts`.

A record is `{ id, text, metadata }`, where `metadata` maps keys to strings, numbers or booleans.

## 1. `similarity(left, right)`

The cosine similarity of two vectors: their dot product divided by the product of their lengths. Return `0` when either vector has length zero, and throw an error when the two vectors have different dimensions. Write it yourself; the tests compare it with `cosineSimilarity` from `@dojo/ai`.

## 2. `matchesFilter(metadata, filter)`

`filter` maps keys to a value or a list of values. A record matches when, for **every** key of the filter, the metadata has that key and its value equals the filter value, or is one of the values when the filter value is a list. An empty or missing filter matches everything.

## 3. `createVectorIndex({ embedder })`

`embedder` is a function from a list of texts to a list of vectors. It defaults to `(texts) => embed(texts)` from `@dojo/ai`. The index has four operations:

- **`add(records)`**: embeds all the records' texts in **one** `embedder` call and stores each record with its vector. Adding an id that already exists replaces that record (text, metadata and vector). The first vectors set the index's dimension; if any vector of a later batch has another length, throw an error whose message contains `dimension` and store nothing from that batch.
- **`remove(id)`**: deletes the record and returns `true`, or returns `false` when the id is unknown.
- **`count()`**: the number of records.
- **`search(query, { topK = 3, filter, minScore })`**: embeds only the query (one `embedder` call with `[query]`), keeps the records that match `filter`, scores each with `similarity(queryVector, recordVector)`, drops scores below `minScore` (no minimum when it is missing), sorts by score from highest to lowest and returns the first `topK` as `{ id, text, metadata, score }`.

Filtering happens before ranking: with a filter, `topK` results are returned whenever at least `topK` records match, however high other records score.
