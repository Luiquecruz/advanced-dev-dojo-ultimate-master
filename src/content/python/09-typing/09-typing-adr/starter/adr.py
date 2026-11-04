ADR = {
    "id": 9,
    # TODO: a short title naming the decision
    "title": "",
    # TODO: accept the decision
    "status": "proposed",
    # TODO: the forces from the briefing: the plugin authors, the payload shapes and their count, the consumers, the edge, the baseline, CI
    "context": "",
    # TODO: one sentence starting with "We will", naming the plugin interface and the payload type you chose
    "decision": "",
    # TODO: at least two {"option": ..., "reason": ...} you considered and rejected, each reason citing a fact from the briefing
    "alternatives": [],
    # TODO: what the team gains and what it pays or must watch
    "consequences": {"positive": [], "negative": []},
}

PLAN = {
    # TODO: outside authors, no forced inheritance, a runtime check in register()
    "plugin_interface": "concrete_base",
    "runtime_checkable": False,
    # TODO: payloads stay dicts for 20 teams who want key checking
    "payloads": "dict",
    # TODO: compute how many payload types the SDK defines: 3 services, shared shapes defined once
    "payload_definitions": 0,
    # TODO: untrusted data, validated once at the edge
    "edge_validation": "none",
    # TODO: the newest syntax that Python 3.12 runs
    "generics_syntax": "typevar",
    # TODO: CI must type-check the SDK
    "checker": "none",
    # TODO: at least two {"pattern": ..., "reason": ...}
    "rejected": [],
}
