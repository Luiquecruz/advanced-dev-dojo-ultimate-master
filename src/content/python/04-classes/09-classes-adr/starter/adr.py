ADR = {
    "id": 4,
    # TODO: a short title naming the decision
    "title": "",
    # TODO: accept the decision
    "status": "proposed",
    # TODO: the forces from the briefing: the reused rules, the line items and the memory budget, the shared behaviors, the spike
    "context": "",
    # TODO: one sentence starting with "We will", naming the validation mechanism and the memory layout you chose
    "decision": "",
    # TODO: at least two {"option": ..., "reason": ...} you considered and rejected, each reason citing a fact from the briefing
    "alternatives": [],
    # TODO: what the team gains and what it pays or must watch
    "consequences": {"positive": [], "negative": []},
}

PLAN = {
    # TODO: compute the memory of 1 000 000 line items, in MB, for the layout you choose
    "estimated_memory_mb": 0,
    # TODO: 40 mutable entity types, standard library only, one style
    "entities": "namedtuple",
    # TODO: the same rules on 15 fields, also on later assignments
    "validation": "properties",
    # TODO: money amounts, SKUs and addresses never change and are dict keys
    "value_objects": "mutable",
    # TODO: each entity type picks a different subset of audit, timestamps and soft delete
    "shared_behavior": "inheritance",
    "cooperative_super": False,
    # TODO: 152 or 72 bytes per line item against the budget
    "memory": "default",
    # TODO: at least two {"pattern": ..., "reason": ...}
    "rejected": [],
}
