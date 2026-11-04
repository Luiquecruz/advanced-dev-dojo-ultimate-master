Write the ADR and the plan for the **domain model of an order system**.

## Briefing

A team is rewriting the domain layer of an order system in Python. It has **40 entity types** (orders, line items, customers, shipments...) and a handful of value objects (money amounts, SKUs, addresses).

- **Validation:** the same rules (positive quantity, non-negative amount, ISO currency code, bounded length) are reused across **15 fields** spread over many entity types. Entities are mutable: a line item's quantity changes after creation, and every rule must also run on those later assignments.
- **Value objects:** money amounts, SKUs and addresses never change after creation; they are compared by value and used as dict keys.
- **Shared behavior:** audit trails, timestamps and soft delete are shared by many classes, and each entity type picks a **different subset** of them.
- **Memory:** a pricing job keeps **1 000 000 line items** in memory, with a budget of **100 MB** (100 × 10⁶ bytes) for them. A measurement on the target interpreter gave **152 bytes** per line item with a per-instance `__dict__` and **72 bytes** with `__slots__`. Use these numbers as given.
- **Dependencies:** the domain package is vendored into a partner's sandbox and must use the **standard library only**. A third-party serializer, configured per class, converts entities and value objects to JSON.
- **One style:** the team wants a single modelling style for all 40 entity types.
- **Spike result:** decorating a class with `@dataclass(slots=True)` replaced every descriptor field with a plain slot, so the validation silently disappeared. A slotted plain class whose descriptors store values in private slots kept the validation.

## Task

In `adr.py`, define two constants.

**`ADR`**, the record:

- `id`: a positive integer; `title`: at least 10 characters; `status`: `"accepted"`.
- `context`: at least 80 characters; mentions the `line item`s and the `memory` budget.
- `decision`: at least 40 characters, starts with `We will`, and names the validation mechanism (`descriptor`, `property` or `__post_init__`) and, when you choose slots, the word `slot`.
- `alternatives`: at least two `{"option", "reason"}` with distinct options (at least 3 characters) and reasons of at least 20 characters.
- `consequences`: `{"positive": [...], "negative": [...]}`, each with at least one item of at least 15 characters.

**`PLAN`**, the design:

- `estimated_memory_mb`: a number, the memory the 1 000 000 line items need with your `memory` choice, in MB (10⁶ bytes). Compute it from the briefing.
- `entities`: `"dataclass"`, `"plain_class"`, `"namedtuple"` or `"pydantic"`.
- `validation`: `"descriptors"`, `"properties"` or `"post_init"`.
- `value_objects`: `"frozen_dataclass"` or `"mutable"`.
- `shared_behavior`: `"mixins"`, `"inheritance"` or `"composition"`.
- `cooperative_super`: `True` or `False`, whether every method in a chain hands over with `super()`.
- `memory`: `"slots"` or `"default"`.
- `rejected`: at least two `{"pattern", "reason"}` with distinct patterns (at least 3 characters) and reasons of at least 20 characters.

The plan must be coherent with the briefing. The tests check these relationships, so reason from the facts rather than from the field names:

1. The estimate matches your `memory` choice and the measurement, and it fits the budget.
2. A rule reused by 15 fields lives in one place, and it must run on assignments after construction.
3. Entities are mutable, standard-library only, and must keep their validation under the memory layout you chose.
4. Value objects are immutable and hashable.
5. Each entity type combines a different subset of shared behaviors; behaviors combined by multiple inheritance must cooperate.
6. The decision sentence names the mechanisms you put in the plan.

The tests check structure and coherence, not your wording.
