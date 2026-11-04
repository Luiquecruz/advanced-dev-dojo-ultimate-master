# Checkpoint: the Dispatch ADR

This module showed what `match` is good at: checking the **shape** of data and binding its parts in one step. It did not say that every branch on a message type should be a `match`. Once the set of types grows and several teams add to it, the question changes from "how do I read this payload?" to "how does a payload find its handler, and who edits what when a type is added?".

The checkpoint turns that question into an **Architecture Decision Record** plus a **plan** whose numbers come from the briefing.

## Four ways to dispatch

```py
from dataclasses import dataclass
from functools import singledispatch

@dataclass
class OrderPaid:
    TYPE = "order.paid"
    order_id: str

# 1. match: a closed set of shapes, tested top to bottom
def route(message):
    match message:
        case {"type": "order.paid", "order_id": str(order_id)}:
            return f"paid {order_id}"
        case _:
            raise LookupError(f"unknown type {message.get('type')!r}")

# 2. dict registry: an open set, filled from any module
HANDLERS = {}

def handles(tag):
    def register(function):
        if tag in HANDLERS:
            raise ValueError(f"{tag} already has a handler")
        HANDLERS[tag] = function
        return function
    return register

@handles("order.paid")
def on_order_paid(payload):
    return f"paid {payload.order_id}"

# 3. singledispatch: keyed by the class of the first argument
@singledispatch
def handle(payload):
    raise LookupError(f"no handler for {type(payload).__name__}")

@handle.register
def _(payload: OrderPaid):
    return f"paid {payload.order_id}"

print(route({"type": "order.paid", "order_id": "A1"}))
print(HANDLERS[OrderPaid.TYPE](OrderPaid("A2")))
print(handle(OrderPaid("A3")))
```

The fourth is **polymorphism**: every payload class defines `handle(self)`, and adding a type means adding a class.

| Mechanism | Cost per message | Adding a type | Dict payloads |
| --- | --- | --- | --- |
| `match`, `if`/`elif` | grows with the cases tested before the hit | edit the one function | destructured directly |
| dict registry | one hash lookup | register from the team's module | keyed by any value you can compute, such as a tag |
| `singledispatch` | a cached lookup by class | `register` from any module | every JSON object is a `dict`, so it cannot tell them apart |
| polymorphism | a method lookup | a new subclass | needs classes you own and may edit |

Two mechanisms deserve a closer look. CPython compiles a `match` into tests that run in order, with no jump table, so a message whose case comes last, or an unknown message, pays for every case before it. And `singledispatch.register` on a class that already has an implementation **replaces it without a warning**, while a registry you write can refuse duplicates.

## The arithmetic

```py
types_now, per_quarter, quarters = 12, 3, 6
at_horizon = types_now + per_quarter * quarters   # 30 types
rate = 600_000 / 60 / 2                           # 5 000 messages/s per instance
budget_us = 0.03 / rate * 1_000_000               # 3% of one core: 6.0 µs per message
linear_us = at_horizon * 0.15                     # 4.5 µs when every case fails
```

Here one central `match` still fits at the horizon. Change the growth or the budget and it does not: the decision follows from numbers you compute, not from a preference for one syntax. Measure the cost per case on the real machine before you trust a constant like `0.15`.

## Who edits what

Dispatch is also an ownership decision. With one `match` or one `if`/`elif` chain, every new type is an edit to a file all teams share, and the merge queue becomes the bottleneck. With a registry, a team adds a module that registers its handler, and the shared code never changes. With polymorphism, the behavior lives on the payload class, which only works when those classes are yours to edit.

## Where `match` still belongs

A registry chooses the handler; it does not read the payload. Inside one type's decoder, a short `match` over that type's payload versions is exactly the tool this module taught: few cases, owned by one team, and each case validates and binds the fields of one shape.

```py
def decode_order_paid(raw):
    match raw:
        case {"version": 2, "order": {"id": str(order_id)}}:
            return OrderPaid(order_id)
        case {"version": 1, "order_id": str(order_id)}:
            return OrderPaid(order_id)
        case _:
            raise ValueError("unsupported order.paid payload")
```

## Coherence is the point

The tests check that the computed figures match the briefing, that a dispatch whose cost grows with the types fits the budget at the horizon, that the key can distinguish the payloads, that the extension point matches the mechanism and the team rules, and that unknown types stay visible.
