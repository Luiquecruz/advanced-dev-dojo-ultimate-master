Write the retrieval ADR for **Brightdesk Answers**, the AI assistant that answers end customers on every Brightdesk customer's help center.

## Briefing

Each Brightdesk customer (a **tenant**) publishes help center articles; their end customers ask questions in a chat widget, and Answers replies from those articles.

- **Corpus:** 4 200 tenants, from 50 to 20 000 articles each. Articles are Markdown with headings; many contain error codes, SKUs and plan names.
- **Access:** an article is either public or internal (visible to the tenant's agents only). A tenant must never see another tenant's articles; end customers must never see internal ones.
- **Freshness:** contracts promise that an unpublished, edited or deleted article stops being served within **5 minutes**.
- **Latency:** the retrieval stage (search plus any reranking) must stay within **400 ms p95**.
- **Quality:** **recall@5 of at least 0.90** on the 400-query golden set built from real chats. The answer prompt holds **5 passages**.
- **Cost:** retrieval at most **$1.00 per 1 000 queries**.
- **Grounding:** every answer cites its articles. When no passage passes the evidence threshold, the chat is handed to a human agent.

Retrieval variants measured on the golden set (k = 5):

| Chunking | Retrieval | Reranker | recall@5 | nDCG@5 | p95 latency | Cost per 1 000 queries |
| --- | --- | --- | --- | --- | --- | --- |
| fixed | vector | none | 0.71 | 0.58 | 90 ms | $0.10 |
| recursive | vector | none | 0.78 | 0.66 | 120 ms | $0.10 |
| recursive | bm25 | none | 0.74 | 0.63 | 60 ms | $0.02 |
| recursive | hybrid | none | 0.87 | 0.75 | 140 ms | $0.12 |
| structure-aware | hybrid | none | 0.89 | 0.78 | 140 ms | $0.12 |
| structure-aware | vector | cross-encoder | 0.86 | 0.80 | 290 ms | $0.58 |
| recursive | hybrid | cross-encoder | 0.93 | 0.84 | 310 ms | $0.60 |
| structure-aware | hybrid | cross-encoder | 0.95 | 0.87 | 320 ms | $0.60 |
| structure-aware | hybrid | llm | 0.96 | 0.88 | 1 900 ms | $6.00 |

Hybrid rows fuse BM25 and vector rankings with Reciprocal Rank Fusion; rerankers score the top 50 fused candidates.

## Task

In `adr.py`, define two module-level dicts. Keys keep the same camelCase names as the JSON contract (`"permissionFilter"`, `"maxLagMinutes"`, `"goldenSetSize"`).

**`ADR`**, the record:

- `"id"`: a positive integer.
- `"title"`: at least 10 characters.
- `"status"`: `"accepted"`.
- `"layer"`: `"context"`.
- `"context"`: at least 80 characters; mentions latency, recall or the golden set, and tenants or permissions.
- `"decision"`: at least 40 characters, starts with `We will`.
- `"alternatives"`: a list of at least two `{"option": ..., "reason": ...}` dicts with distinct `"option"` texts (at least 3 characters) and a `"reason"` of at least 20 characters.
- `"consequences"`: `{"positive": [...], "negative": [...]}`, each a list with at least one item of at least 15 characters.

**`RETRIEVAL_PLAN`**, the plan:

- `"chunking"`: `{"strategy", "size", "overlap"}`, where `"strategy"` is `"fixed"`, `"recursive"` or `"structure-aware"`, `"size"` is a positive number of characters and `"overlap"` is at least 0 and at most a quarter of `"size"`.
- `"retrieval"`: `"vector"`, `"bm25"` or `"hybrid"`; `"fusion"`: `"rrf"` for hybrid retrieval, otherwise `None`.
- `"reranker"`: `"none"`, `"cross-encoder"` or `"llm"`.
- `"candidates"`: how many fused candidates are retrieved before reranking, at least 20 and at least `"topK"`.
- `"topK"`: how many passages enter the answer prompt.
- `"permissionFilter"`: where access is enforced: `"before-ranking"`, `"after-ranking"` or `"prompt-instruction"`.
- `"tenantIsolation"`: `"tenant-filter"` (a `tenantId` filter on a shared index) or `"index-per-tenant"`.
- `"freshness"`: `{"mode", "maxLagMinutes"}`, where `"mode"` is `"event-driven"` (index updates on publish, edit and delete events) or `"nightly-batch"`, and `"maxLagMinutes"` is the worst-case delay you commit to.
- `"citations"`: `"required"` or `"optional"`.
- `"noEvidence"`: what happens when nothing passes the threshold: `"handoff"`, `"answer-anyway"` or `"refuse"`.
- `"evaluation"`: `{"metric", "target", "goldenSetSize"}`.

The plan must be coherent with the briefing:

1. `"chunking"`'s strategy, `"retrieval"` and `"reranker"` are a measured row of the table, and that row meets recall@5 ≥ 0.90, p95 ≤ 400 ms and cost ≤ $1.00 per 1 000 queries.
2. Hybrid retrieval uses RRF fusion; `"topK"` is the 5 passages the prompt holds; `"candidates"` is at least 20.
3. Permissions are enforced before ranking, with either tenant isolation option.
4. The freshness mode can meet the 5-minute promise, and `"maxLagMinutes"` is at most 5.
5. Citations are required and an answer without evidence is handed to a human.
6. The evaluation gate is `"recall@5"` with a target of at least 0.90 on the 400-query golden set.

The tests check structure and coherence, not your wording.
