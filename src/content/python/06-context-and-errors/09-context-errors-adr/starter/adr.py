ADR = {
    "id": 6,
    # TODO: a short title naming the decision
    "title": "",
    # TODO: accept the decision
    "status": "proposed",
    # TODO: the forces from the briefing: resources per run and per active region, the locks, the incident,
    # what operators, callers and support need
    "context": "",
    # TODO: one sentence starting with "We will", naming the multi-resource and the validation mechanisms you chose
    "decision": "",
    # TODO: at least two {"option": ..., "reason": ...} you considered and rejected, each reason citing a fact from the briefing
    "alternatives": [],
    # TODO: what the team gains and what it pays or must watch
    "consequences": {"positive": [], "negative": []},
}

PLAN = {
    # TODO: how each resource is released, given what the libraries ship and the incident
    "resource_management": "gc",
    # TODO: the number of resources differs between an average and a peak run
    "multi_resource": "nested_with",
    # TODO: compute the resources a peak run holds open at the same time
    "peak_resources": 0,
    # TODO: callers branch on transient failures by type
    "error_model": "strings",
    # TODO: support wants every validation error at once
    "validation_errors": "first_error",
    # TODO: compute the largest number of validation errors one request can report
    "max_errors_reported": 1,
    # TODO: operators need the original exception
    "chaining": "none",
    # TODO: the order ID must reach operators while messages stay stable
    "context_notes": False,
    # TODO: at least two {"pattern": ..., "reason": ...}
    "rejected": [],
}
