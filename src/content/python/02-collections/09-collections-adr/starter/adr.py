ADR = {
    "id": 9,
    # TODO: a short title naming the decision
    "title": "",
    # TODO: accept the decision
    "status": "proposed",
    # TODO: the forces from the briefing: the (tenant, event_id) key, the lookup volume, the retries, arrival order, the header bug
    "context": "",
    # TODO: one sentence starting with "We will", naming the key type you chose
    "decision": "",
    # TODO: at least two {"option": ..., "reason": ...} you considered and rejected, each reason citing a fact from the briefing
    "alternatives": [],
    # TODO: what the team gains and what it pays or must watch
    "consequences": {"positive": [], "negative": []},
}

PLAN = {
    # TODO: compute both numbers from the briefing
    "lookups_per_second": 0,
    "bytes_per_payload_budget": 0,
    # TODO: 12 million lookups per minute by key over 2 million payloads
    "lookup_container": "list",
    "protocol": "sequence",
    # TODO: the same event id exists in several tenants
    "key_type": "frozenset",
    # TODO: payloads are replayed in arrival order and 5% are retries
    "ordering": "sorted",
    "dedupe": "set",
    "replay_source": "separate_list",
    # TODO: providers spell the same header in different cases
    "headers": "dict",
    # TODO: at least two {"pattern": ..., "reason": ...}
    "rejected": [],
}
