# Invoices on the wire

The billing API speaks camelCase JSON, money travels as decimal strings, and partners receive a JSON Schema of the invoice. Today `export` calls `json.dumps(vars(invoice), default=str)`: snake_case keys, `"2026-11-04 10:30:00+00:00"` instead of ISO 8601, nested lines turned into their `str()` text, and no total. Fix the models and the two functions.

Implement in `main.py`:

## Models

Both models share one config: `alias_generator=to_camel` (from `pydantic.alias_generators`), `validate_by_alias=True`, `validate_by_name=True` and `extra="forbid"`. So input may use `unitPrice` or `unit_price`, and errors are located by the name the input used.

- `class Line(BaseModel)`: `sku: str`, `quantity: int` greater than 0 (`Field(gt=0)`), `unit_price: Decimal` of at least 0 (`Field(ge=0)`).
- `class Invoice(BaseModel)`: `invoice_id: str`, `issued_at: datetime`, `lines: list[Line]`, plus `total_due`, a `@computed_field` property returning the `Decimal` sum of `quantity * unit_price` (`Decimal("0")` for no lines).

`total_due` is output only: an exported invoice sent back as input fails with `extra_forbidden` at `("totalDue",)`.

## `export(invoice)`

Return a dict containing only JSON types, with camelCase keys: `issuedAt` as ISO 8601 (`"2026-11-04T10:30:00Z"`), decimals as strings (`"19.90"`), and `totalDue` included. `json.dumps` must accept it.

## `schema_properties(model, mode="validation")`

Return the sorted names of the top-level `properties` of `model.model_json_schema(mode=mode)` for **any** model class. For `Invoice` that is `["invoiceId", "issuedAt", "lines"]` in validation mode and adds `"totalDue"` in `"serialization"` mode.
