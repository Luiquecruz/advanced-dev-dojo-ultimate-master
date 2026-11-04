**Question this module answers:** when does a data model need runtime parsing and validation instead of type hints and dataclasses?

## Prerequisites

Module 04 (dataclasses), module 06 (exceptions), module 07 (`json`, `Decimal`, `datetime`) and module 09 (annotations, `TypedDict`, `get_type_hints`). This module uses **Pydantic v2**, the one third-party package of the track, loaded on demand in the sandbox.

## Parsing, not just checking

Type hints are never enforced at runtime (module 09). Data that crosses a **trust boundary**, an HTTP body, a webhook, a queue message from another team, a config file, can hold anything. Two ways to deal with it:

- **Validate**: check the dict and keep using the dict. Every later reader must trust that the check ran.
- **Parse**: turn the untrusted input into a typed object once, at the edge, or fail with a precise error. Code past the edge only sees valid objects.

```py
from pydantic import BaseModel

class Order(BaseModel):
    id: int
    total: float

order = Order.model_validate({"id": "17", "total": 9})
print(order)            # id=17 total=9.0: converted, checked, typed
```

## Coming from TypeScript and JavaScript

TypeScript types disappear at runtime, so `JSON.parse(body) as Order` is a promise nobody checks. Zod fixes that with a schema object: `OrderSchema.parse(data)` returns typed data or throws a `ZodError` with `issues` (`path`, `code`). Pydantic is the same idea with one twist: the **class is the schema**, so there is no `z.infer<typeof OrderSchema>` step. The habits to unlearn: a dataclass or `TypedDict` is the `as Order` cast, not the Zod parse; and Pydantic converts `"17"` to `17` by default, where `z.number()` would reject it.

## The path

1. `BaseModel` versus dataclasses: parsing, errors as data, unknown keys.
2. Lax and strict modes: which conversions are allowed, and where.
3. Field constraints and field and model validators.
4. Serialization, aliases and JSON Schema.
5. A quiz on pydantic-core, the Rust engine, and on performance.
6. An ADR for the validation strategy of three services.

## When to choose it

The closing decision: which model type each boundary uses (`BaseModel`, dataclass or `TypedDict`), where coercion is allowed and where it is strict, how unknown fields and errors are reported, and whether the schema is published as JSON Schema, sized from the traffic of the services in the briefing.
