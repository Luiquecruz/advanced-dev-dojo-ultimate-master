Build a long-term memory for an assistant: extract candidate memories with the model, filter them with a write policy, merge near-duplicates by embedding similarity, and retrieve by relevance, recency and importance. Time is injected with `now()` (milliseconds), so the tests move the clock instead of waiting.

Use `embed(text)` and `cosineSimilarity(a, b)` from `@dojo/ai`. An hour is `3 600 000` ms.

## 1. `extractCandidates(model, conversation)`

Make one `model.generate` call with `responseFormat: { type: 'json' }` whose messages include the `conversation` text. The expected reply is `{ "memories": [{ "text": string, "importance": integer 1–10 }] }`.

Return the valid items as `{ text, importance }` with `text` trimmed, in order. An item is valid when `text` is a string that is not empty after trimming and `importance` is an integer from 1 to 10. Return `[]` when the reply is not `finishReason: 'stop'` (a refusal, for example), is not valid JSON, or has no `memories` array. A `ModelError` thrown by the model is not caught.

## 2. `isWorthStoring(candidate, minImportance = 3)`

`true` when `importance` is at least `minImportance`, the trimmed text has at least three words (separated by whitespace), and it does not end with `?`.

## 3. `recencyScore(lastAccessedAt, now, decayPerHour)`

`decayPerHour` raised to the number of hours (fractional) from `lastAccessedAt` to `now`. A `lastAccessedAt` in the future counts as zero hours, so the score is never above 1.

## 4. `createMemoryStore(options)`

Options, all optional: `now` (default `Date.now`), `minImportance` (default `3`), `duplicateThreshold` (default `0.9`), `decayPerHour` (default `0.995`), `weights` (default `{ relevance: 1, recency: 1, importance: 1 }`).

A memory is `{ id, text, importance, embedding, createdAt, lastAccessedAt }`. Ids are unique strings.

**`write(candidate)`**

1. If `isWorthStoring(candidate, minImportance)` is false, return `{ action: 'skipped' }` and change nothing.
2. Embed the trimmed text and find the stored memory with the highest cosine similarity. If that similarity is at least `duplicateThreshold`, **merge**: keep its `id` and `createdAt`, replace `text` and `embedding` with the new ones, keep the higher `importance`, set `lastAccessedAt` to `now()`, and return `{ action: 'merged', memory }`.
3. Otherwise **add** a memory with `createdAt` and `lastAccessedAt` set to `now()` and return `{ action: 'added', memory }`.

**`retrieve(query, limit = 5)`**

For every memory compute:

- `relevance`: `cosineSimilarity(embed(query), memory.embedding)`, with negative values raised to `0`;
- `recency`: `recencyScore(memory.lastAccessedAt, now(), decayPerHour)`;
- `importance`: `memory.importance / 10`;
- `score`: `weights.relevance × relevance + weights.recency × recency + weights.importance × importance`.

Return the best `limit` entries as `{ memory, score, relevance, recency, importance }`, highest score first. Then set `lastAccessedAt` of each **returned** memory to `now()` (the returned entries keep the values used for scoring).

**`all()`** returns every stored memory.

The tests check the components and scores numerically, merge decisions at both sides of the threshold, the effect of retrieval on recency, and every malformed extraction across seeds.
