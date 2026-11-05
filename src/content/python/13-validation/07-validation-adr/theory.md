# Checkpoint: the Validation ADR

This module answered one question: **when does data need runtime parsing instead of type hints?** At a trust boundary, always: annotations check nothing, so a `BaseModel` (or a `TypeAdapter`) turns untrusted input into typed objects once, or fails with structured errors. Lax mode converts what the edge must accept, strict mode refuses what an internal contract must never receive, validators enforce the rules a type cannot express, and the same model serializes the output and generates the JSON Schema.

The checkpoint turns those mechanisms into the validation strategy of a small system: an **Architecture Decision Record** plus a **plan** whose numbers come from the briefing.

## Parse at the edge, typed objects inside

The architecture has the same shape at every scale: parse at the edge, then pass typed objects inside. Inside, the guarantee does not rest on trust alone: a frozen dataclass is a real object that a checker can verify statically and whose fields nobody can reassign after parsing; a nested `list` or `dict` stays mutable, so store tuples and frozensets when the contract must not change. Between services, each receiving service validates the message again with a strict `TypeAdapter` or model, because another team's code is outside its control.

## The decision checklist

1. **Who sends the data?** Outsiders whose payloads you cannot change need a parsing model and, often, lax conversions. Your own services need strict contracts, so drift fails loudly.
2. **Which fields must never be guessed?** Money, permissions and payout flags stay strict even inside a lax model (`StrictBool`, `Strict()`).
3. **What is the contract's edge?** Unknown fields are either a bug or an attack: `extra="forbid"` at public boundaries.
4. **Who reads the errors?** Software needs `type` and `loc`; nobody needs the rejected input echoed back, least of all when it holds personal data or secrets.
5. **What happens after parsing?** Convert once to an immutable domain object and stop validating inside the process.
6. **How is the contract documented?** Generated JSON Schema, one document per published contract version, so documentation cannot fall behind the code.
7. **How big is an honest request?** A body limit sized from the largest legitimate payload, checked before parsing, so nobody makes the parser work on 50 MB.

## Sizing with numbers

```py
events_per_day = 2_592_000
events_per_second = events_per_day / 86_400      # 30.0 on average
event_types, release_every, accepted_for = 3, 4, 12   # months
live_versions = accepted_for // release_every    # 3 versions of each type at a time
documents = event_types * live_versions          # 9 schema documents
largest = 50 * 200 + 2_000                       # 50 lines of 200 bytes plus the envelope
limit_range = (largest, 2 * largest)             # at least 12 000 bytes, under 24 000
```

At 30 events per second, validation cost is negligible: Pydantic validates a typical event in microseconds. Performance is rarely what decides where to validate; correctness, ownership and the blast radius of a bad payload are.

## Example: a shipment webhook relay

```py
PLAN = {
    "edge_model": "basemodel",
    "internal_model": "frozen_dataclass",
    "mode": "lax_at_edge_strict_inside",
    "unknown_fields": "forbid",
    "validation_errors": "structured",
    "schema_docs": "json_schema",
    "schema_documents": 9,
    "rejected": [{"option": "revalidate in every function", "reason": "Objects are already parsed and frozen."}],
}
```

If every carrier sent exact JSON types and the relay had no internal hops, strict mode at the edge would be the better choice: lax conversions exist for clients you cannot fix, not by default.
