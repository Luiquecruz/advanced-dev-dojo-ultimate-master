ADR = {
    "id": 10,
    # TODO: a short title naming the decision
    "title": "",
    # TODO: accept the decision
    "status": "proposed",
    # TODO: the forces from the briefing: event rate, enrichment calls and their quota, CPU cost, staleness, failures, shutdown
    "context": "",
    # TODO: one sentence starting with "We will", naming the fan-out, the queue and where the CPU work runs
    "decision": "",
    # TODO: at least two {"option": ..., "reason": ...} you considered and rejected, each reason citing a briefing fact
    "alternatives": [],
    # TODO: what the team gains and what it pays or must watch
    "consequences": {"positive": [], "negative": []},
}

PLAN = {
    # TODO: where the 2 400 enrichment calls per second wait
    "io_model": "threads",
    # TODO: how the calls of one event are started and how their failures surface
    "fanout": "unbounded_tasks",
    # TODO: compute the average number of enrichment calls in flight (Little's law: rate x mean latency)
    "expected_in_flight": 0,
    # TODO: an integer between the in-flight estimate and what the quota allows at mean latency
    "concurrency_limit": 0,
    # TODO: events older than 500 ms are stale
    "backpressure": "none",
    "queue_maxsize": 0,
    # TODO: 1 ms of pure-Python CPU per event on a GIL build
    "cpu_work": "event_loop",
    # TODO: CPU-seconds per second divided by the utilization target, within the vCPUs left by the event loop
    "cpu_pool_size": 0,
    # TODO: p95 latency is four times the mean, and 5% of calls fail
    "timeouts": "none",
    "failure_handling": "swallow",
    # TODO: the instance must finish what it holds within 10 s
    "shutdown": "kill",
    "shutdown_deadline_s": 0,
    # TODO: at least two {"pattern": ..., "reason": ...}
    "rejected": [],
}
