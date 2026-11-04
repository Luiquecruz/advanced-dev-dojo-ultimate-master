Build a long-term memory for an assistant: extract candidate memories with the model, filter them with a write policy, merge near-duplicates by embedding similarity, and retrieve by relevance, recency and importance. Time is injected with `now()` (milliseconds), so the tests move the clock instead of waiting.

Use `embed(text)` and `cosine_similarity(a, b)` from `dojo_ai`. An hour is `3_600_000` ms. Candidates, memories and results are dicts; their keys keep the JSON names (`"createdAt"`, `"lastAccessedAt"`).

## 1. `extract_candidates(model, conversation)`

Make one `await model.generate(request)` call with `"responseFormat": {"type": "json"}` whose messages include the `conversation` text. The expected reply is `{"memories": [{"text": string, "importance": integer 1–10}]}`.

Return the valid items as `{"text", "importance"}` dicts with `"text"` stripped, in order. An item is valid when it is a dict, `"text"` is a string that is not empty after stripping, and `"importance"` is an integer (not a float, string or bool) from 1 to 10. Return `[]` when the reply's `"finishReason"` is not `"stop"` (a refusal, for example), the text is not valid JSON, or it has no `"memories"` list. A `ModelError` raised by the model is not caught.

## 2. `is_worth_storing(candidate, min_importance=3)`

`True` when `"importance"` is at least `min_importance`, the stripped text has at least three words (separated by whitespace), and it does not end with `?`.

## 3. `recency_score(last_accessed_at, now, decay_per_hour)`

`decay_per_hour` raised to the number of hours (fractional) from `last_accessed_at` to `now`. A `last_accessed_at` in the future counts as zero hours, so the score is never above 1.

## 4. `create_memory_store(now=..., min_importance=3, duplicate_threshold=0.9, decay_per_hour=0.995, weights=None)`

`now` defaults to the current time in milliseconds; `weights` defaults to `{"relevance": 1, "recency": 1, "importance": 1}`. Returns a `MemoryStore`.

A memory is `{"id", "text", "importance", "embedding", "createdAt", "lastAccessedAt"}`. Ids are unique strings.

**`write(candidate)`**

1. If `is_worth_storing(candidate, min_importance)` is false, return `{"action": "skipped"}` and change nothing.
2. Embed the stripped text and find the stored memory with the highest cosine similarity. If that similarity is at least `duplicate_threshold`, **merge**: keep its `"id"` and `"createdAt"`, replace `"text"` and `"embedding"` with the new ones, keep the higher `"importance"`, set `"lastAccessedAt"` to `now()`, and return `{"action": "merged", "memory": memory}`.
3. Otherwise **add** a memory with `"createdAt"` and `"lastAccessedAt"` set to `now()` and return `{"action": "added", "memory": memory}`.

**`retrieve(query, limit=5)`**

For every memory compute:

- `"relevance"`: `cosine_similarity(embed(query), memory["embedding"])`, with negative values raised to `0`;
- `"recency"`: `recency_score(memory["lastAccessedAt"], now(), decay_per_hour)`;
- `"importance"`: `memory["importance"] / 10`;
- `"score"`: `weights["relevance"] × relevance + weights["recency"] × recency + weights["importance"] × importance`.

Return the best `limit` entries as `{"memory", "score", "relevance", "recency", "importance"}`, highest score first. Then set `"lastAccessedAt"` of each **returned** memory to `now()` (the returned entries keep the values used for scoring).

**`all()`** returns every stored memory.

The tests check the components and scores numerically, merge decisions at both sides of the threshold, the effect of retrieval on recency, and every malformed extraction across seeds.
