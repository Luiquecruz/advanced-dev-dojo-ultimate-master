# Checkpoint: the Object Model ADR

This module taught the facts that every design decision about shared data depends on: names bind to objects and never copy, containers are mutable or immutable, only hashable values can be keys, copies are shallow unless you ask for more, `==` and `is` answer different questions, and truthiness is not absence. The checkpoint turns them into a decision: an **Architecture Decision Record** for a shared value object, plus a **plan** a teammate could implement.

An ADR is never "we will make it immutable". It is a set of answers, each tied to a number or a symptom from the briefing.

## The decision checklist

1. **Mutability.** If many components hold the same object, who may change it? A mutable object shared by reference makes every holder a possible writer. An immutable one makes sharing safe.
2. **Collections inside the object.** A frozen dataclass that holds a `list` is still mutable through the list. Use `tuple` and `frozenset` for the fields of a value object.
3. **Hashing and equality.** If the object is a cache key or a set member, it must be hashable, and equal objects must hash equal. Equality by value follows from that; equality by identity makes every instance a different key.
4. **Sharing and copying.** Count reads and writes. Copying on every read is paid per read; copying (or rebuilding) on write is paid per write. If reads outnumber writes by orders of magnitude, share references and replace the object when it changes.
5. **Absence.** If `0`, `""` or `None` are valid data, "not provided" needs a sentinel, and the check must use `is`, not truthiness.
6. **Rejected options.** Record at least two options you did not choose and the fact that ruled each one out.

## Coherence is the point

Put the briefing's numbers into the plan before you choose. A cost you computed (reads × copy time, in the budget's unit) turns "copying is expensive" into a comparison the tests can check.

The plan must agree with itself. A hashable object that holds a list is incoherent. Reading 2 000 times per request while paying a deep copy each time is incoherent with a latency budget. Using `if not discount` when `0` is a valid discount is a bug waiting for production. The tests of this checkpoint check exactly these relationships.

## Example: a feature-flag snapshot

```py
PLAN = {
    "value_object": {"mutability": "immutable", "hashable": True, "equality": "by_value", "inner_collections": "frozenset"},
    "copy_on_read_cost_ms": 300 * 40 / 1_000,   # 300 flags per request x 40 microseconds per copy
    "sharing": "share_reference",
    "copy_strategy": "none",
    "absence": {"marker": "sentinel", "checks_use": "is"},
    "rejected": [{"pattern": "deep copy on every read", "reason": "Flags are read on every request and change a few times a day, so copying would cost far more than rebuilding on change."}],
}
```

The same checklist gives a different plan when the object is edited by users thousands of times per second and read rarely.

## When to choose it

- **Immutable shared value objects** whenever many components read the same data and writes are rare.
- **Copy on write** (build a new object on change) when readers must never see partial updates.
- **A mutable object owned by one component** when only that component writes and nobody keeps a reference.
- Avoid deep copies on hot read paths and avoid hashing mutable objects.
