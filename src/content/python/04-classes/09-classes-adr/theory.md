# Checkpoint: the Classes ADR

This module answered one question from several sides: where does an attribute live, and which hook runs when it is read, written or created? A `property` intercepts one name; a **descriptor** class intercepts many names with one rule and learns each name through `__set_name__`. `__post_init__` runs once, at construction. `__slots__` removes the per-instance `__dict__`. A frozen dataclass gives value semantics with equality and hashing. Mixins combine behavior only when every method in the chain calls `super()`.

The checkpoint turns these mechanisms into a decision for a whole domain model: an **Architecture Decision Record** plus a **plan** a teammate could implement.

## The decision checklist

1. **Where does each rule live?** One rule on one field fits a `property`. The same rule on many fields belongs in one descriptor class. Ask also *when* it must run: `__post_init__` validates construction only, while a data descriptor runs on every assignment.
2. **Which class shape?** Dataclasses remove boilerplate for data-heavy classes; plain classes give full control over storage; `namedtuple` is immutable and positional; third-party models add a dependency.
3. **Value objects or entities?** Values that never change and are compared or hashed are frozen. Entities with identity and changing state stay mutable.
4. **How much memory?** Multiply before you choose: instances × bytes per instance, compared with the budget. Use measured sizes for your interpreter, never a rule of thumb.
5. **Do the mechanisms compose?** Check the interactions the module showed: `@dataclass(slots=True)` turns every field into a slot, which replaces a descriptor stored under the same name; slotted classes need mixins with `__slots__ = ()`; a mixin that calls its base by name breaks every chain it joins.
6. **How is behavior shared?** When each class picks a different subset of behaviors, a single inheritance chain cannot express it. Use mixins with cooperative `super()` or composition.
7. **Rejected options.** Record at least two options and the fact that ruled each one out.

## Coherence is the point

A plan that says "properties" for 15 reused rules copies the same code 15 times. A plan with `__post_init__` validation for mutable entities lets later assignments through. A memory estimate that ignores the chosen layout means nothing. The tests check exactly these relationships, and the estimate is a number you compute.

```py
items = 2_000_000
bytes_per_item = {"default": 120, "slots": 56}       # measured on the target interpreter
for layout, size in bytes_per_item.items():
    print(layout, items * size / 10**6, "MB")        # default 240.0 MB, slots 112.0 MB
```

## Example: a telemetry model

```py
PLAN = {
    "estimated_memory_mb": 2_000_000 * 56 / 10**6,   # 112 MB with slots
    "entities": "plain_class",
    "validation": "descriptors",                     # 9 sensor fields share 3 range rules
    "value_objects": "frozen_dataclass",             # units and sensor ids
    "shared_behavior": "composition",                # each reading holds a calibrator
    "cooperative_super": False,                      # no mixin chain to cooperate in
    "memory": "slots",
    "rejected": [{"pattern": "dataclass per reading", "reason": "Readings change after creation and need validation on assignment."}],
}
```

With a 100 MB budget this plan would be incoherent: even slots exceed it, so the team would have to change the data layout itself (arrays of numbers instead of objects), and the ADR should say so.
