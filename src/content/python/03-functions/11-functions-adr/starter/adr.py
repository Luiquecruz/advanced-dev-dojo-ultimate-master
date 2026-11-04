ADR = {
    "id": 3,
    # TODO: a short title naming the decision
    "title": "",
    # TODO: accept the decision
    "status": "proposed",
    # TODO: the forces from the briefing: the 9 teams and their combinations, the dashboard, tokens, quota, timings and the deadline
    "context": "",
    # TODO: one sentence starting with "We will", naming the mechanism, how metadata is kept and where time comes from
    "decision": "",
    # TODO: at least two {"option": ..., "reason": ...} you considered and rejected, each reason citing a briefing fact
    "alternatives": [],
    # TODO: what the teams gain and what they pay or must watch
    "consequences": {"positive": [], "negative": []},
}

PLAN = {
    # TODO: 9 teams, 14 combinations, one reviewed builder
    "mechanism": "global_interceptors",
    # TODO: the five concerns outermost first, placed by the dashboard, cache, token and quota requirements
    "order": ["auth", "retry", "metrics", "cache", "rate_limit"],
    # TODO: traces must name the original operation
    "metadata_preserved": False,
    # TODO: suites run in parallel threads of one process and never sleep
    "time_source": "system_clock",
    # TODO: two clients built side by side share nothing
    "state_location": "module_global",
    # TODO: who handles an expired token?
    "retried_errors": "all_exceptions",
    # TODO: at least 2, and as many as fit the 15 s deadline in the worst case
    "retry_attempts": 3,
    # TODO: compute the most requests one client call can send with your order
    "max_requests_per_call": 3,
    # TODO: compute every timeout, wait and refresh on the longest path through your order
    "worst_case_latency_s": 0,
    # TODO: at least two {"pattern": ..., "reason": ...}
    "rejected": [],
}
