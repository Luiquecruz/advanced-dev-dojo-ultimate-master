ADR = {
    "id": 9,
    "title": "Store event payloads in a dict keyed by (tenant, event_id) tuples",
    "status": "accepted",
    "context": (
        "Four services share about 2 million webhook payloads and look them up 12 million times per minute by tenant and event id, "
        "where event ids repeat across tenants. About 5% of arrivals are provider retries, an audit service replays payloads in arrival order, "
        "and last week two spellings of the same header were stored as two entries and a signature check read the wrong one."
    ),
    "decision": (
        "We will keep payloads in one dict keyed by (tenant, event_id) tuples, insert only the first arrival of each key so insertion order "
        "is arrival order, and store headers in a CaseInsensitiveDict, exposing the store through the mapping protocol."
    ),
    "alternatives": [
        {
            "option": "A list of payloads searched by key",
            "reason": "200 000 lookups per second scanning a million payloads on average is 2 x 10^11 comparisons per second, against a budget of 10^8.",
        },
        {
            "option": "frozenset of tenant and event id as the key",
            "reason": "It cannot tell the tenant from the event id, so swapped parts collide and equal parts collapse into one element.",
        },
        {
            "option": "Normalize header names in each service",
            "reason": "One forgotten entry point already stored two spellings of a header and broke a signature check.",
        },
    ],
    "consequences": {
        "positive": [
            "Lookups by tenant and event id are hash lookups whatever the size of the store.",
            "Retries are dropped without a second structure and replays follow arrival order.",
        ],
        "negative": [
            "JSON has no tuple keys, so the JSON contract must send payloads as an array or join the key explicitly.",
            "Every header access goes through a Python-level mapping class, slower than a plain dict.",
        ],
    },
}

PLAN = {
    "lookups_per_second": 12_000_000 / 60,
    "bytes_per_payload_budget": 4 * 10**9 / 2_000_000,
    "lookup_container": "dict",
    "protocol": "mapping",
    "key_type": "tuple",
    "ordering": "insertion",
    "dedupe": "dict.fromkeys",
    "replay_source": "dict_order",
    "headers": "CaseInsensitiveDict",
    "rejected": [
        {
            "pattern": "set for de-duplication",
            "reason": "A set drops the arrival order that the audit replay and the JSON arrays depend on.",
        },
        {
            "pattern": "separate replay list",
            "reason": "A second copy of each 1 500 byte payload needs 3 000 bytes per payload against a budget of 2 000.",
        },
        {
            "pattern": "sorted store",
            "reason": "Sorting replaces arrival order with key order and costs a sort for each of the 600 000 arrivals per minute.",
        },
    ],
}
