ADR = {
    "id": 13,
    # TODO: a short title naming the decision
    "title": "",
    # TODO: accept the decision
    "status": "proposed",
    # TODO: the forces from the briefing: partners and their payloads, volume, payout flag, unknown fields, errors,
    # drift between services, schema documentation, body size
    "context": "",
    # TODO: one sentence starting with "We will", naming the mode at the gateway and between services and the schema
    "decision": "",
    # TODO: at least two {"option": ..., "reason": ...} you considered and rejected, each reason citing a briefing fact
    "alternatives": [],
    # TODO: what the teams gain and what they pay or must maintain
    "consequences": {"positive": [], "negative": []},
}

PLAN = {
    # TODO: what the gateway parses webhooks into
    "edge_model": "typeddict",
    # TODO: the domain object inside a service
    "internal_model": "dict",
    # TODO: 30% of partners send numbers as strings; services drift between contract versions
    "mode": "strict_everywhere",
    # TODO: refund_approved pays money out
    "payout_flag": "lax_bool",
    # TODO: discount_override reached a handler last quarter
    "unknown_fields": "ignore",
    # TODO: partner software parses the 422 body; payloads carry emails and card tokens
    "validation_errors": "strings",
    "error_input": "echoed",
    # TODO: machine-readable and generated from the models
    "schema_docs": "wiki",
    # TODO: compute the average rate from the daily volume
    "events_per_second": 0,
    # TODO: event types times the versions accepted at any time
    "schema_documents": 0,
    # TODO: at least the largest legitimate order, under twice its size
    "max_body_bytes": 0,
    # TODO: at least two {"option": ..., "reason": ...}
    "rejected": [],
}
