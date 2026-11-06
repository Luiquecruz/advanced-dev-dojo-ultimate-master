Validation turns JSON into objects; **serialization** turns them back. A model knows its fields, their types and their aliases, so it can produce both the output and a **JSON Schema** that documents the contract.

```py
from datetime import datetime, timezone
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, computed_field
from pydantic.alias_generators import to_camel

class Payment(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, validate_by_name=True, validate_by_alias=True)
    payment_id: str
    paid_at: datetime
    amount: Decimal
    fee: Decimal

    @computed_field
    @property
    def net_amount(self) -> Decimal:
        return self.amount - self.fee

payment = Payment(payment_id="P-1", paid_at=datetime(2026, 11, 4, 9, 0, tzinfo=timezone.utc), amount="10.00", fee="0.35")
print(payment.model_dump())                          # snake_case keys, datetime and Decimal objects
print(payment.model_dump(mode="json", by_alias=True))
# {'paymentId': 'P-1', 'paidAt': '2026-11-04T09:00:00Z', 'amount': '10.00', 'fee': '0.35', 'netAmount': '9.65'}
print(sorted(Payment.model_json_schema(mode="serialization")["properties"]))
# ['amount', 'fee', 'netAmount', 'paidAt', 'paymentId']
```

## How it works

- **Two dump modes.** `model_dump()` returns Python objects; `model_dump(mode="json")` returns only JSON types: `datetime` as ISO 8601 (`Z` for UTC), `Decimal` as a string so no digit is lost, `UUID`, `Enum` and sets converted. `model_dump_json()` goes straight to a JSON string inside pydantic-core, without an intermediate dict.
- **Aliases.** `Field(alias="paidAt")` or a config-wide `alias_generator=to_camel` maps Python names to wire names. `validate_by_alias` and `validate_by_name` (Pydantic 2.11+) choose which names input may use; output uses aliases only with `by_alias=True` or `ConfigDict(serialize_by_alias=True)`. `validation_alias` and `serialization_alias` split the two directions. Error `loc` tuples use the alias the input used.
- **Computed fields.** `@computed_field` on a `@property` adds a derived value to every dump and to the serialization schema, marked `readOnly`. It is output only: with `extra="forbid"`, sending the dumped `netAmount` back is an `extra_forbidden` error, which is the honest contract.
- **Choosing fields.** `include=`, `exclude=`, `exclude_none=True`, `exclude_unset=True` (only what the input set), or `Field(exclude=True)` for a field that never leaves the process.
- **JSON Schema.** `model_json_schema()` describes what validation accepts (`mode="validation"`, the default), `mode="serialization"` what dumps produce; they differ for computed fields and for types such as `Decimal` (input: number or string, output: string). Nested models go into `$defs`, constraints become keywords (`Field(gt=0)` is `exclusiveMinimum: 0`), and the output follows the JSON Schema dialect OpenAPI 3.1 uses.

Pitfall: a naive `datetime` is dumped without an offset (`2026-11-04T09:00:00`), and every reader will guess its timezone. Validate with `AwareDatetime` when timestamps must carry one.

## Common mistakes

**Calling `json.dumps(model.model_dump())`.** The default Python mode keeps `datetime` and `Decimal` objects, so `json.dumps` raises `TypeError: Object of type datetime is not JSON serializable`. The usual "fix", `default=str`, is worse: it writes `'2026-11-04 09:00:00+00:00'` (not ISO 8601 with `T`), keeps snake_case keys and turns nested models into their `str()` text:

```py
# wrong: TypeError, or with default=str a wire format nobody agreed on
json.dumps(payment.model_dump())
json.dumps(vars(payment), default=str)

# right: JSON types only, with the wire names
payment.model_dump(mode="json", by_alias=True)
payment.model_dump_json(by_alias=True)          # the same, as a JSON string
```

## Legacy vs modern

v1 had `.dict()`, `.json()` and `.schema()`, aliases through `allow_population_by_field_name`, and `@property` values never appeared in output. v2 renamed them to `model_dump`, `model_dump_json`, `model_json_schema`, and added `computed_field`, `mode="json"`, and (in 2.11) `validate_by_name`/`validate_by_alias`/`serialize_by_alias`, which supersede `populate_by_name`.

This sandbox runs Pydantic 2.12.5. In later 2.x releases, JSON validation (`model_validate_json`) counts a key matching only an unused alias or field name as extra data instead of silently dropping it, which matters for models that combine `extra="forbid"` with an alias generator. Sources: the Pydantic 2.12 docs "Serialization", "Alias" and "JSON Schema".

## When to choose it

- **`mode="json"` plus `by_alias=True`** (or `model_dump_json`) whenever the result leaves the process: HTTP responses, queue messages, cache entries.
- **Python mode** to hand data to other Python code that wants real `datetime`/`Decimal` objects.
- **An alias generator** when the wire format has its own convention (camelCase JSON, a partner's names); plain field names when you own both ends.
- **Computed fields** for values derived from other fields that clients need; never accept them as input.
- **Publish the JSON Schema** (or the OpenAPI document built from it) for any public contract, and regenerate it from the model instead of maintaining it by hand.
