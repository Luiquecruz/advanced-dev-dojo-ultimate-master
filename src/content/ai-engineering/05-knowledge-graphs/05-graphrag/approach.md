1. Treat the graph as undirected for clustering and neighborhoods: a supplier and the part it supplies belong to the same topic whatever the edge direction.
2. Make community detection deterministic: a fixed visiting order and tie-break mean the same graph always yields the same communities, so reports can be cached and compared between runs. Weighting edges by shared neighbors keeps a single bridge from merging two dense groups.
3. Summarize each community from its own entities and relations only. Isolation keeps prompts small and summaries focused, and the tests check that nothing from other communities leaks in.
4. Handle report generation like any model output: validate the JSON, retry once, and fall back to a report computed from the graph so one bad reply never breaks the index.
5. Route with a mechanical rule first: a question that names an entity is local, anything else is global. Local search spends one call on a bounded neighborhood.
6. Answer global questions with map-reduce: rated points per batch of reports, unusable batches skipped, the best points kept by score, one reduce call, and no answer at all when no evidence survived.
