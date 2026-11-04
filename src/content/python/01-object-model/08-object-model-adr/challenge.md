Write the ADR and the plan for the **price rules** shared by a marketplace's pricing services.

## Briefing

Six services in one Python process share a configuration object called `PriceRule`. Each rule has a `rate`, a `discount`, a list of `fees` and a parent rule. Last month a service appended a surcharge to a rule's `fees` list, and every other service started charging it.

- **Volume:** 40 000 rules are loaded in memory. Rules change **twice a day**; every request reads about **2 000** rules.
- **Latency:** the pricing code may add at most **5 ms** per request. Deep-copying one rule takes about **60 microseconds**.
- **Caching:** rules are used as keys of a price cache and compared by their contents in tests.
- **Values:** `discount=0` means "no discount", and `None` means "inherit from the parent rule". Update calls also need to say "this field was not provided".
- **Constraint:** the services cannot be rewritten at once, so the shared object must be safe to hand out without defensive copies.

## Task

In `adr.py`, define two constants.

**`ADR`**, the record:

- `id`: a positive integer; `title`: at least 10 characters; `status`: `"accepted"`.
- `context`: at least 80 characters; mentions the `surcharge` bug and that the object is `shared` (or aliased).
- `decision`: at least 40 characters, starts with `We will`, and names the mutability you chose (`immutable` or `mutable`).
- `alternatives`: at least two `{"option", "reason"}` with distinct options (at least 3 characters) and reasons of at least 20 characters.
- `consequences`: `{"positive": [...], "negative": [...]}`, each with at least one item of at least 15 characters.

**`PLAN`**, the design:

- `value_object`: `{"mutability": "immutable" | "mutable", "hashable": bool, "equality": "by_value" | "by_identity", "inner_collections": "tuple" | "frozenset" | "list" | "set"}`.
- `copy_on_read_cost_ms`: a number, the time in **milliseconds** that one request would spend if every rule it reads were deep-copied first. Compute it from the briefing.
- `sharing`: `"share_reference"`, `"copy_on_read"` or `"copy_on_write"`.
- `copy_strategy`: `"none"`, `"shallow"` or `"deep"`.
- `absence`: `{"marker": "none" | "sentinel", "checks_use": "is" | "truthiness"}`.
- `rejected`: at least two `{"pattern", "reason"}` with distinct patterns (at least 3 characters) and reasons of at least 20 characters.

The plan must be coherent with the briefing. The tests check these relationships, so reason from the facts rather than from the field names:

1. A rule used as a cache key must keep its hash while it is stored, and a rebuilt rule with the same contents must find the same cache entry.
2. Whatever the rule promises about hashing must also hold for every collection stored inside it.
3. A sharing policy may not cost more per request than the latency budget, measured with your `copy_on_read_cost_ms`. Sharing a reference involves no copy; copying, on read or on write, needs a copy strategy that actually copies.
4. "Not provided" must stay distinguishable from every valid value of a field, including `0` and `None`, and the check must use an operator that cannot confuse them.
5. The decision sentence names the mutability you put in the plan.

The tests check structure and coherence, not your wording.
