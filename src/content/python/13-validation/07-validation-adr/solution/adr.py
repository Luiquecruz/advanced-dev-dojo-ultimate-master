ADR = {
    "id": 13,
    "title": "Parse partner order events leniently at the gateway and strictly between services",
    "status": "accepted",
    "context": (
        "The public gateway receives 8 000 000 order events per day from partners, about 93 per second; 30% of partners "
        "send numbers as strings and cannot change this year, and some sent 'yes' or 1 for the refund_approved payout "
        "flag. A forwarded unknown field (discount_override) was applied downstream last quarter. Rejected webhooks get "
        "a 422 that partner software parses, and payloads carry emails and card tokens. Orders and billing drift between "
        "contract versions, and partners need machine-readable schema documentation for 4 event types with 3 accepted "
        "versions each. The largest legitimate body is 64 000 bytes."
    ),
    "decision": (
        "We will parse webhooks at the gateway with Pydantic models in lax mode, except a StrictBool payout flag, with "
        "extra fields forbidden and a 96 000-byte body limit checked before parsing; return structured 422 errors "
        "without input values; convert to frozen dataclasses inside each service and validate messages between "
        "services with strict TypeAdapters; and publish one generated JSON Schema per event type and accepted version."
    ),
    "alternatives": [
        {
            "option": "Strict mode at the gateway",
            "reason": "30% of partners send numbers as strings and cannot change their payloads this year.",
        },
        {
            "option": "Lax mode on every hop",
            "reason": "Version drift between orders and billing would be converted silently instead of failing loudly.",
        },
        {
            "option": "TypedDict payloads checked by hand",
            "reason": "A TypedDict validates nothing at runtime, and hand-written checks drift from the documentation.",
        },
    ],
    "consequences": {
        "positive": [
            "Code behind the gateway only ever sees parsed, immutable domain objects.",
            "Partner documentation is regenerated from the same models that validate the webhooks.",
        ],
        "negative": [
            "Each service keeps two shapes, the wire model and the frozen domain dataclass, plus a mapping between them.",
            "Twelve schema documents must be published and retired on the release calendar.",
        ],
    },
}

PLAN = {
    "edge_model": "basemodel",
    "internal_model": "frozen_dataclass",
    "mode": "lax_at_edge_strict_inside",
    "payout_flag": "strict_bool",
    "unknown_fields": "forbid",
    "validation_errors": "structured",
    "error_input": "omitted",
    "schema_docs": "json_schema",
    "events_per_second": round(8_000_000 / 86_400),
    "schema_documents": 4 * (18 // 6),
    "max_body_bytes": 96_000,
    "rejected": [
        {
            "option": "unknown fields ignored at the gateway",
            "reason": "A dropped field is invisible to the partner, and an allowed one reached a handler last quarter.",
        },
        {
            "option": "error messages that quote the rejected value",
            "reason": "Webhook bodies carry customer emails and card tokens that would be echoed back.",
        },
        {
            "option": "schema documentation in a wiki",
            "reason": "Partners need machine-readable documents, and a wiki falls behind the models.",
        },
    ],
}
