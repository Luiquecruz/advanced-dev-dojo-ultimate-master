# Checkpoint: the Typing ADR

This module answered one question from several sides: what do annotations guarantee, who checks them, and what happens to them at runtime? Annotations are evaluated objects that nothing enforces. A checker reads them before the program runs; runtime code (`get_type_hints`, `dataclasses`, your validators) reads them while it runs. Protocols bring structural typing to nominal classes, TypedDict types dicts without changing them, PEP 695 scopes type parameters, overloads and `TypeIs` give precise types, and Python 3.14 evaluates annotations lazily.

The checkpoint turns these facts into a typing strategy for a **published package**: an **Architecture Decision Record** plus a **plan** that other teams can rely on.

## The decision checklist

1. **Who implements your interfaces?** If you own every implementation, an `ABC` or a base class can share code and fail at instantiation. If outsiders implement them, a `Protocol` lets any class with the right members match, with no import of your package in their class hierarchy.
2. **Must the interface be checked at runtime?** A registry that rejects bad plugins needs `@runtime_checkable`, and the ADR should say what that check covers: member presence, not signatures.
3. **What shape does the data keep?** Data that stays a dict for its consumers is a `TypedDict`; data you own and convert once can be a dataclass; an untyped `dict` gives consumers nothing.
4. **Where is data validated?** Annotations and TypedDict validate nothing. Untrusted input needs a runtime validator at the boundary, once.
5. **How many types do you maintain?** Count them from the inventory, and remove the duplicates you are required to define once. The number drives module layout, review effort and test fixtures.
6. **Which syntax does the baseline allow?** PEP 695 needs 3.12, PEP 696 defaults need 3.13, `TypeIs` needs 3.13 (or `typing_extensions`).
7. **What enforces it?** A pinned checker in CI; without one, every annotation is a comment.
8. **Rejected options.** Record at least two, each with the fact that ruled it out.

## Coherence is the point

A plan that picks an ABC for outside plugin authors contradicts "no forced inheritance". A plan with TypedDict payloads and no validator trusts data that nobody checks. A count that adds up every service's shapes defines shared shapes twice. The tests check exactly these relationships, and the count is a number you compute.

```py
shapes = {"catalog": 10, "search": 5}
shared = 3                                   # each exposed by both services
definitions = sum(shapes.values()) - shared  # 12, not 15: every shared shape is defined once
print(definitions)
```

## Example: an internal CLI toolkit

```py
PLAN = {
    "plugin_interface": "abc",             # every command is written in-house and shares helpers
    "runtime_checkable": False,            # ABCs already fail at instantiation
    "payloads": "dataclass",               # config is parsed once into objects with methods
    "payload_definitions": 10 + 5 - 3,     # 12
    "edge_validation": "runtime_validator",
    "generics_syntax": "typevar",          # the toolkit still supports Python 3.11
    "checker": "mypy",
    "rejected": [{"pattern": "Protocol for commands", "reason": "Commands share helper methods that a protocol would not provide."}],
}
```

The same mechanisms lead to different answers because the facts differ: in-house implementers, data converted once, an older baseline. Read the briefing before the field names.
