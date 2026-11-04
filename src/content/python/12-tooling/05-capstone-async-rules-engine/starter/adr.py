ADR = {
    "id": 12,
    # TODO: a short title naming the decision
    "title": "",
    # TODO: accept the decision
    "status": "proposed",
    # TODO: the forces from the briefing, including the fleet peak and the decision deadline
    "context": "",
    # TODO: one sentence starting with "We will"
    "decision": "",
    # TODO: at least two {"option": ..., "reason": ...} you considered and rejected
    "alternatives": [],
    # TODO: what the team gains and what it pays
    "consequences": {"positive": [], "negative": []},
}

PLAN = {
    # TODO: start from the measured capacity of one worker, then survive the loss of one worker at peak
    "deployment": {"workers": 1, "events_per_worker": 2000},
    "concurrency": {
        # TODO: one event fans out to 36 feature-store calls and 4 CPU checks
        "model": "threads",
        "fanout": "unbounded_tasks",
        # TODO: compute the waves of calls one event can afford after its queue budget
        "per_event_limit": 1,
        # TODO: compute the calls in flight for one worker (Little's law), within the connection cap
        "global_limit": 0,
        # TODO: compute how many events fit in the queue budget at the worker's capacity
        "queue_maxsize": 0,
    },
    # TODO: where the CPU-bound rules run, and how many CPU-seconds per second they need
    "cpu_rules": {"where": "event_loop", "pool_size": 0},
    # TODO: who writes the rules, and how a new rule is found without editing the engine
    "rule_interface": {"kind": "concrete_base", "discovery": "manual_list"},
    # TODO: the evaluation deadline the engine applies after the queue wait, and what a timeout produces
    "deadline": {"per_event_ms": 1000, "on_timeout": "drop_event"},
    # TODO: the drain deadline from the briefing
    "shutdown_deadline_s": 60,
    # TODO: at least two {"option": ..., "reason": ...}
    "rejected": [],
}
