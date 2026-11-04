ADR = {
    "id": 4,
    "title": "Retrieve help center articles with structure-aware chunks, hybrid search and a cross-encoder",
    "status": "accepted",
    "layer": "context",
    "context": (
        "Brightdesk Answers serves end customers of 4 200 tenants from Markdown help center articles full of error codes and plan names. "
        "Retrieval must stay within 400 ms p95 and $1.00 per 1 000 queries, reach recall@5 of 0.90 on our 400-query golden set, "
        "never show one tenant another tenant’s articles or end customers internal ones, and stop serving unpublished or deleted articles within 5 minutes."
    ),
    "decision": (
        "We will chunk articles by Markdown section, retrieve 50 candidates with BM25 and vectors fused by RRF inside a tenant- and audience-filtered search, "
        "rerank them with a cross-encoder and send the top 5 with required citations, handing off to a human when nothing passes the threshold."
    ),
    "alternatives": [
        {
            "option": "Vector-only retrieval",
            "reason": "Recall@5 tops out at 0.86 even with reranking because error codes and SKUs are missed; the golden set requires 0.90.",
        },
        {
            "option": "Hybrid search without a reranker",
            "reason": "Cheapest hybrid option at 140 ms, but its 0.89 recall@5 misses the 0.90 target.",
        },
        {
            "option": "LLM reranker over the top 50",
            "reason": "Best recall (0.96) but 1 900 ms p95 and $6.00 per 1 000 queries break both the latency and the cost limits.",
        },
        {
            "option": "Nightly re-indexing",
            "reason": "A deleted article could be served for up to a day, far beyond the 5-minute contractual promise.",
        },
    ],
    "consequences": {
        "positive": [
            "Recall@5 of 0.95 at 320 ms p95 and $0.60 per 1 000 queries leaves headroom on every limit.",
            "Section chunks keep heading paths, so citations link to the exact part of an article.",
            "Forbidden articles are never ranked or sent to the model, whatever the prompt says.",
        ],
        "negative": [
            "Two indexes (BM25 and vectors) and a reranker service must be kept in sync and monitored.",
            "Event-driven indexing needs a publish, edit and delete event stream plus a daily reconciliation job to catch missed events.",
            "The cross-encoder adds 180 ms; a slower reranker version would push retrieval over budget.",
        ],
    },
}

RETRIEVAL_PLAN = {
    "chunking": {"strategy": "structure-aware", "size": 1600, "overlap": 200},
    "retrieval": "hybrid",
    "fusion": "rrf",
    "reranker": "cross-encoder",
    "candidates": 50,
    "topK": 5,
    "permissionFilter": "before-ranking",
    "tenantIsolation": "tenant-filter",
    "freshness": {"mode": "event-driven", "maxLagMinutes": 5},
    "citations": "required",
    "noEvidence": "handoff",
    "evaluation": {"metric": "recall@5", "target": 0.9, "goldenSetSize": 400},
}
