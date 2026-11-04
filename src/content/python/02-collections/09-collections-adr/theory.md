# Checkpoint: the Collections ADR

This module showed that a container is a promise. A `dict` promises lookup by a hashable key and insertion order, a `set` promises uniqueness without order, a `list` promises order and duplicates at the cost of a linear search, and a protocol (`Mapping`, `Sequence`) promises the syntax other code will use on your object. The checkpoint turns those promises into a decision: an **Architecture Decision Record** for a shared payload store, plus a **plan** a teammate could implement.

The answer is never "use a dict". It is a set of answers, each tied to a number or a constraint from the briefing.

## The decision checklist

1. **Access pattern.** How is the data read? Lookup by key at high volume needs hashing (`dict`, `set`); a `list` answers `x in items` by scanning every element. A `set` only answers "is it there"; when a key must lead to a value, the container is a `dict`.
2. **Key type.** A key must be hashable, and equal keys must mean the same thing. A composite key is a `tuple`: it is hashable when its parts are, and its positions keep `("acme", "evt-42")` apart from `("evt-42", "acme")`. A `frozenset` is hashable too, but it forgets the order and collapses repeated parts. A `list` is not hashable at all. A joined string works only when the separator can never appear in the parts.
3. **Order.** Does anyone depend on the order of the data? A `dict` keeps insertion order as a language guarantee; a `set` keeps none; sorting replaces arrival order with value order.
4. **De-duplication.** `set(items)` removes duplicates and the order with them. `dict.fromkeys(items)` (or a dict keyed by the unique key) removes duplicates and keeps the first arrival.
5. **Key normalization.** Header names, emails and usernames often compare case-insensitively. Either normalize at every entry point or own the rule in one `MutableMapping`; a plain `dict` lets `Content-Type` and `content-type` become two entries.
6. **Protocol.** What syntax will callers use? `store[key]`, `key in store` and `store.get(key)` mean the mapping protocol; `store[0]` and slicing mean the sequence protocol.
7. **Rejected options.** Record at least two options you did not choose and the fact that ruled each one out.

## Coherence is the point

Put the briefing's numbers into the plan before you choose: a rate per second and a budget per item turn "lists are slow" and "copies are expensive" into comparisons. The plan must agree with itself and with the numbers. Millions of lookups per minute against a `list` is incoherent. A `frozenset` key for `(tenant, event_id)` silently merges two different events. De-duplicating with a `set` contradicts "replay in arrival order". A plain `dict` for headers contradicts "header names are case-insensitive". The tests of this checkpoint check exactly these relationships.

```py
events = [("acme", "evt-1"), ("acme", "evt-2"), ("acme", "evt-1")]
list(set(events))           # duplicates gone, order arbitrary
list(dict.fromkeys(events)) # [('acme', 'evt-1'), ('acme', 'evt-2')]
frozenset(("x", "x"))       # frozenset({'x'}): two parts became one
```

## Example: a session cache

```py
PLAN = {
    "lookups_per_second": 3_000_000 / 60,     # 50 000
    "bytes_per_payload_budget": 10**9 / 500_000,   # 2 000 bytes per session
    "lookup_container": "dict",
    "key_type": "tuple",          # (user_id, device_id)
    "ordering": "insertion",      # evict the oldest first
    "replay_source": "dict_order",
    "dedupe": "dict.fromkeys",
    "headers": "lower_on_write",  # one ingestion function owns the rule
    "protocol": "mapping",
    "rejected": [{"pattern": "list of sessions", "reason": "Each request looks up a session, and scanning a list grows with every login."}],
}
```

The same checklist gives a different plan for a leaderboard read in score order, where `sorted` order and a sequence protocol are the point.

## When to choose it

- **A `dict` keyed by a `tuple`** for lookups by a composite key, with insertion order for free.
- **`dict.fromkeys` or a dict keyed by the unique id** for de-duplication that keeps arrival order; a **`set`** when order does not matter.
- **A `MutableMapping` class** when a key rule (case, normalization) must hold for every operation; normalization at the boundary when one entry point is enough.
- Avoid `list` for keyed access at volume, and avoid `frozenset` for keys whose parts have positions.
