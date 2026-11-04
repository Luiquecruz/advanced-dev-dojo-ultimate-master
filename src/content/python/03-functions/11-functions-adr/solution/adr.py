ADR = {
    "id": 3,
    "title": "Compose the orders SDK concerns as decorator factories in one builder",
    "status": "accepted",
    "context": (
        "orders-sdk is used by 9 product teams in 14 different combinations of caching, metrics, retries, token refresh "
        "and rate limiting, and the platform team must fix their order in one reviewed place. The latency dashboard needs "
        "one sample per client call with cache hits included, the token service allows one refresh per client call, and "
        "the orders API quota counts every request. Requests time out at 1.5 s, a refresh takes up to 0.5 s, retries wait "
        "0.25 s, and callers give up at a 15 s deadline. The teams' suites run in parallel threads of one process."
    ),
    "decision": (
        "We will build each concern as a decorator factory that keeps its state in a closure and preserves metadata with "
        "functools.wraps, compose them in one builder as metrics, cache, auth, retry and rate limit (outermost first), "
        "inject the clock and the sleep, retry only transient errors and cap each retry run at 4 attempts."
    ),
    "alternatives": [
        {
            "option": "Team subclasses overriding send",
            "reason": "14 combinations would need 14 classes, and each MRO would decide the order instead of one builder.",
        },
        {
            "option": "Interceptors registered at import time",
            "reason": "The order would depend on which team module is imported first, and every client would share them.",
        },
        {
            "option": "Cache as the outermost layer",
            "reason": "Hits would return before the metrics layer runs, so the dashboard would miss the fastest calls.",
        },
    ],
    "consequences": {
        "positive": [
            "A team adds a concern as one factory and combines it with the others at its own call site.",
            "In the worst case a call sends 8 requests and ends after 14 s, inside the 15 s deadline.",
        ],
        "negative": [
            "Every new concern needs a reviewed position in the builder and a new worst-case calculation.",
            "During an outage one call can spend 8 requests of quota, so the limiter starts rejecting calls sooner.",
        ],
    },
}

PLAN = {
    "mechanism": "decorators",
    "order": ["metrics", "cache", "auth", "retry", "rate_limit"],
    "metadata_preserved": True,
    "time_source": "injected_clock",
    "state_location": "closure",
    "retried_errors": "transient_only",
    "retry_attempts": 4,
    "max_requests_per_call": 2 * 4,
    "worst_case_latency_s": 2 * (4 * 1.5 + 3 * 0.25) + 0.5,
    "rejected": [
        {
            "pattern": "module-level cache dict shared by every client",
            "reason": "Clients of different teams would read each other's cached responses, in production and in tests.",
        },
        {
            "pattern": "retrying AuthExpired in the retry layer",
            "reason": "The same expired token would be sent again, spending attempts and quota on requests that cannot succeed.",
        },
        {
            "pattern": "patching time.monotonic in tests",
            "reason": "The suites run in parallel threads of one process, so one patch moves the time of every other suite.",
        },
    ],
}
