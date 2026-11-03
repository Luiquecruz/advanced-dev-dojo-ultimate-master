`similarity` is one loop that accumulates three sums: `left[i] * right[i]`, `left[i] ** 2` and `right[i] ** 2`. The result is the first sum divided by the product of the square roots of the other two, or `0` when that product is `0`. Check the lengths before the loop.
---
Keep the records in a `Map` keyed by id, each with its vector: `Map.set` on an existing id replaces it, which is the upsert you need. In `add`, call `embedder(batch.map((record) => record.text))` once, compare every vector's length with the stored dimension (or the first vector's length on the first batch) and throw before touching the map.
---
`search` is a pipeline over `[...records.values()]`: `filter` with `matchesFilter`, `map` to `{ id, text, metadata, score }` (leave the vector out), `filter` by `minScore` (default `-Infinity`), `sort((left, right) => right.score - left.score)`, `slice(0, topK)`. Filtering first is what makes topK fill with matching records.
