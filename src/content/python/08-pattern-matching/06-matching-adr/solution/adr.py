ADR = {
    "id": 8,
    "title": "Dispatch gateway messages through a type-tag registry with match as a per-type decoder",
    "status": "accepted",
    "context": (
        "relay knows 25 message types today and gains 5 per quarter, so it must route 65 types in 8 quarters. "
        "Each of the 4 instances dispatches 5 000 messages/s at peak with 2% of a core, a budget of 4 µs per message, "
        "while a match over every type costs 8.45 µs in the worst case. Payloads arrive as webhook dicts in up to 3 "
        "versions and as generated SDK dataclasses that cannot hold handlers. 3 teams add handlers in their own "
        "packages, a shared file may change once per quarter, and unknown types must reach the dead-letter topic."
    ),
    "decision": (
        "We will decode every webhook dict into its generated dataclass with a small match over that type's payload "
        "versions, dispatch through a dict registry keyed by the TYPE tag that each team fills from its own package "
        "with a registration decorator, and raise unknown tags to the dead-letter topic."
    ),
    "alternatives": [
        {
            "option": "One central match over every message type",
            "reason": "At 65 types the worst case is 8.45 µs, twice the 4 µs budget, and every new type edits one shared file.",
        },
        {
            "option": "A handle() method on each payload class",
            "reason": "The payload dataclasses are regenerated from the schema on every build, so hand-written methods are lost.",
        },
        {
            "option": "functools.singledispatch on the payload class",
            "reason": "It fits the budget, but registering a class twice silently replaces the other team's handler.",
        },
    ],
    "consequences": {
        "positive": [
            "A dispatch costs one dict lookup, about 0.06 µs, whatever the number of types.",
            "Teams add types in their own packages, so the shared dispatch file stays unchanged every quarter.",
        ],
        "negative": [
            "The set of types is only known at runtime, so a missing registration shows up as a dead-lettered message.",
            "Every team package must be imported at startup, or its registrations never happen.",
        ],
    },
}

PLAN = {
    "dispatch": "dict_registry",
    "registry_key": "type_tag",
    "payload_model": "dataclasses",
    "match_role": "leaf_decoder",
    "extension_point": "registry",
    "unknown_types": "raise_to_dead_letter",
    "types_at_horizon": 25 + 5 * 8,
    "lookups_per_second": 1_200_000 // 60 // 4,
    "linear_worst_case_us": (25 + 5 * 8) * 0.13,
    "shared_file_edits_per_quarter": 0,
    "rejected": [
        {
            "pattern": "case _: return default_handler(message)",
            "reason": "Unknown types would be answered instead of reaching the dead-letter topic with their tag.",
        },
        {
            "pattern": "handlers that accept both dicts and dataclasses",
            "reason": "Every handler of three teams would re-validate dict keys and test two payload shapes.",
        },
        {
            "pattern": "a central match that grows by five cases per quarter",
            "reason": "It passes the budget today at 3.25 µs but breaks it within two quarters of growth.",
        },
    ],
}
