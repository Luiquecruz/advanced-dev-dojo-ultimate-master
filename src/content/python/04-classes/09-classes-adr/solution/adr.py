ADR = {
    "id": 4,
    "title": "Model entities as slotted classes with validating descriptors and cooperative mixins",
    "status": "accepted",
    "context": (
        "Forty mutable entity types reuse the same validation rules on 15 fields, and the rules must also run when a field "
        "changes after creation. A pricing job holds 1 000 000 line items within a 100 MB memory budget: 152 bytes per line "
        "item with __dict__ is 152 MB, 72 bytes with __slots__ is 72 MB. Audit, timestamps and soft delete are combined in "
        "different subsets, the package is standard-library only, and a spike showed that dataclass(slots=True) drops "
        "descriptor validation."
    ),
    "decision": (
        "We will define each validation rule once as a descriptor with __set_name__, model entities as plain classes on a "
        "slotted base whose descriptors store values in private slots, model value objects as frozen dataclasses, and "
        "share audit, timestamp and soft-delete behavior through slotted mixins that call super()."
    ),
    "alternatives": [
        {
            "option": "Properties on every validated field",
            "reason": "Fifteen copies of the same getter and setter pairs drift apart, and every new field needs another copy.",
        },
        {
            "option": "Dataclasses validated in __post_init__",
            "reason": "__post_init__ runs only at construction, so a later quantity change on a line item skips every rule.",
        },
        {
            "option": "Pydantic models",
            "reason": "The domain package must stay standard-library only because it is vendored into a partner's sandbox.",
        },
    ],
    "consequences": {
        "positive": [
            "Each rule lives in one descriptor and runs on construction and on every later assignment.",
            "One million line items take about 72 MB, inside the 100 MB budget.",
        ],
        "negative": [
            "Entity classes need a small base with __slots__ and a field list instead of generated dataclass methods.",
            "Every mixin must declare empty __slots__ and keep the shared save signature, or the chain breaks.",
        ],
    },
}

PLAN = {
    "estimated_memory_mb": 1_000_000 * 72 / 1_000_000,
    "entities": "plain_class",
    "validation": "descriptors",
    "value_objects": "frozen_dataclass",
    "shared_behavior": "mixins",
    "cooperative_super": True,
    "memory": "slots",
    "rejected": [
        {
            "pattern": "dataclass(slots=True) with descriptor fields",
            "reason": "The spike showed the generated slots replace the descriptors, so validation silently disappears.",
        },
        {
            "pattern": "default __dict__ layout for line items",
            "reason": "152 bytes for each of 1 000 000 line items is 152 MB against a budget of 100 MB.",
        },
        {
            "pattern": "single inheritance chain of behaviors",
            "reason": "Each entity type needs a different subset of audit, timestamps and soft delete, which one chain cannot express.",
        },
    ],
}
