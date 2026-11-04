Build an in-memory vector index for the Brightdesk handbook: embed passages at ingestion, rank them by cosine similarity to a query, filter by metadata before ranking and drop weak matches. The passages are in `corpus.py`.

A record is a dict `{"id": ..., "text": ..., "metadata": {...}}`, where `metadata` maps keys to strings, numbers or booleans.

## 1. `similarity(left, right)`

The cosine similarity of two vectors (lists of floats): their dot product divided by the product of their lengths. Return `0` when either vector has length zero, and raise a `ValueError` when the two vectors have different dimensions. Write it yourself; the tests compare it with `cosine_similarity` from `dojo_ai`.

## 2. `matches_filter(metadata, filter=None)`

`filter` maps keys to a value or a list of values. A record matches when, for **every** key of the filter, the metadata has that key and its value equals the filter value, or is one of the values when the filter value is a list. An empty or missing filter matches everything.

## 3. `create_vector_index(embedder=None)`

`embedder` is a function from a list of texts to a list of vectors. It defaults to `embed` from `dojo_ai` (which embeds every text of a list). The function returns a `VectorIndex` with four methods:

- **`add(records)`**: embeds all the records' texts in **one** `embedder` call and stores each record with its vector. Adding an id that already exists replaces that record (text, metadata and vector). The first vectors set the index's dimension; if any vector of a later batch has another length, raise a `ValueError` whose message contains `dimension` and store nothing from that batch.
- **`remove(record_id)`**: deletes the record and returns `True`, or returns `False` when the id is unknown.
- **`count()`**: the number of records.
- **`search(query, *, top_k=3, filter=None, min_score=None)`**: embeds only the query (one `embedder` call with `[query]`), keeps the records that match `filter`, scores each with `similarity(query_vector, record_vector)`, drops scores below `min_score` (no minimum when it is `None`), sorts by score from highest to lowest and returns the first `top_k` as `{"id", "text", "metadata", "score"}` dicts.

Filtering happens before ranking: with a filter, `top_k` results are returned whenever at least `top_k` records match, however high other records score.
