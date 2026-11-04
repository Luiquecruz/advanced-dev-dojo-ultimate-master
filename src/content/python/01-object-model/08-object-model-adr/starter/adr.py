ADR = {
    "id": 8,
    # TODO: a short title naming the decision
    "title": "",
    # TODO: accept the decision
    "status": "proposed",
    # TODO: the forces from the briefing: the surcharge bug, the shared object, the read and write volume, the latency budget
    "context": "",
    # TODO: one sentence starting with "We will", naming the mutability you chose
    "decision": "",
    # TODO: at least two {"option": ..., "reason": ...} you considered and rejected, each reason citing a fact from the briefing
    "alternatives": [],
    # TODO: what the team gains and what it pays or must watch
    "consequences": {"positive": [], "negative": []},
}

PLAN = {
    "value_object": {
        # TODO: rules are cache keys that many services share
        "mutability": "mutable",
        "hashable": False,
        "equality": "by_identity",
        "inner_collections": "list",
    },
    # TODO: milliseconds one request would spend deep-copying every rule it reads
    "copy_on_read_cost_ms": 0,
    # TODO: 2 000 reads per request against 2 writes a day, with a 5 ms budget
    "sharing": "copy_on_read",
    "copy_strategy": "deep",
    "absence": {
        # TODO: 0 and None are valid values; "not provided" needs its own marker
        "marker": "none",
        "checks_use": "truthiness",
    },
    # TODO: at least two {"pattern": ..., "reason": ...}
    "rejected": [],
}
