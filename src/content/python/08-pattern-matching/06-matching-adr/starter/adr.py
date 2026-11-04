ADR = {
    "id": 8,
    # TODO: a short title naming the decision
    "title": "",
    # TODO: accept the decision
    "status": "proposed",
    # TODO: the forces from the briefing: growth of the message types, load, budget, payload sources, teams, dead letters
    "context": "",
    # TODO: one sentence starting with "We will", naming the dispatch mechanism and the role of match
    "decision": "",
    # TODO: at least two {"option": ..., "reason": ...} you considered and rejected, each reason citing a briefing fact
    "alternatives": [],
    # TODO: what the teams gain and what they pay or must watch
    "consequences": {"positive": [], "negative": []},
}

PLAN = {
    # TODO: how a payload reaches its handler, and what the dispatch looks up
    "dispatch": "match",
    "registry_key": "none",
    # TODO: 40% webhook dicts, 60% generated SDK dataclasses, handlers want one shape
    "payload_model": "mixed",
    # TODO: where a match statement belongs, if anywhere
    "match_role": "central_router",
    # TODO: what a team does to add a message type
    "extension_point": "edit_match",
    # TODO: unknown types go to the dead-letter topic
    "unknown_types": "silent_default",
    # TODO: message types after 8 quarters of growth
    "types_at_horizon": 0,
    # TODO: dispatches per second for one of the 4 instances at peak
    "lookups_per_second": 0,
    # TODO: cost of failing every case of one match over all the types at the horizon
    "linear_worst_case_us": 0,
    # TODO: edits per quarter to a file that every team shares, caused by your extension point
    "shared_file_edits_per_quarter": 0,
    # TODO: at least two {"pattern": ..., "reason": ...}
    "rejected": [],
}
