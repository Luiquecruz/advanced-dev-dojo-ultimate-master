ADR = {
    "id": 8,
    "title": "Share immutable value objects for price rules",
    "status": "accepted",
    "context": (
        "Six services share the same PriceRule objects. A surcharge appended to one rule's fees list by one service was charged by all of them, "
        "because the rule is a shared mutable object. Each request reads about 2 000 rules and rules change twice a day, with a 5 ms latency budget."
    ),
    "decision": (
        "We will make PriceRule an immutable, hashable value object compared by value, holding its fees in a tuple, shared by reference between services and rebuilt "
        "when a rule changes, with a private sentinel for fields that were not provided."
    ),
    "alternatives": [
        {
            "option": "Deep copy on every read",
            "reason": "Copying costs about 60 microseconds per rule and 2 000 reads per request add 120 ms against a 5 ms budget, to protect against two writes a day.",
        },
        {
            "option": "Keep mutable rules and ask services not to modify them",
            "reason": "A convention failed already: one append to the fees list reached six services, and mutable objects cannot be used safely as cache keys.",
        },
    ],
    "consequences": {
        "positive": [
            "Services can share one rule without defensive copies and cache entries are found by value.",
            "The surcharge bug becomes impossible because a tuple cannot be appended to.",
        ],
        "negative": [
            "Changing a rule means building a new object and replacing the shared reference.",
            "Services that mutate rules today must be changed to request an updated rule instead.",
        ],
    },
}

PLAN = {
    "value_object": {
        "mutability": "immutable",
        "hashable": True,
        "equality": "by_value",
        "inner_collections": "tuple",
    },
    "copy_on_read_cost_ms": 2_000 * 60 / 1_000,
    "sharing": "share_reference",
    "copy_strategy": "none",
    "absence": {
        "marker": "sentinel",
        "checks_use": "is",
    },
    "rejected": [
        {
            "pattern": "deep copy on read",
            "reason": "2 000 reads per request at about 60 microseconds each cost 120 ms, far above the 5 ms budget.",
        },
        {
            "pattern": "truthiness check for missing fields",
            "reason": "A discount of 0 is valid and None means inherit, so both would be mistaken for not provided.",
        },
    ],
}
