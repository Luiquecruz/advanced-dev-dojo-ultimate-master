1. Treat extraction as untrusted structured output: validate the shape item by item and map every model-side failure (refusal, malformed JSON, wrong shape) to "no candidates", while infrastructure errors propagate to whoever schedules the job.
2. Make the write policy a pure predicate with explicit thresholds, so product decisions ("we do not store trivia or questions") become testable rules.
3. Deduplicate against the single most similar memory. One comparison per stored memory is fine at this scale; at production scale the same step is a nearest-neighbor query on a vector index.
4. On a merge, decide field by field: identity and creation time stay, the wording and embedding follow the newest statement, importance never decreases, and the access time is refreshed because the user just mentioned it.
5. Score retrieval as a weighted sum of components that each live in `[0, 1]`, and return the components with the score: they explain every ranking and are what you tune on an eval set.
6. Measure recency from the last access, and refresh it only for what you actually returned, so useful memories stay fresh and unused ones fade instead of being deleted.
