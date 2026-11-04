import json
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, computed_field
from pydantic.alias_generators import to_camel

# TODO: accept Python names (validate_by_name) as well as the camelCase aliases (validate_by_alias).
WIRE_FORMAT = ConfigDict(alias_generator=to_camel, extra="forbid")


class Line(BaseModel):
    model_config = WIRE_FORMAT

    sku: str
    # TODO: quantity must be greater than 0 and unit_price at least 0, declared with Field(...).
    quantity: int
    unit_price: Decimal


class Invoice(BaseModel):
    model_config = WIRE_FORMAT

    invoice_id: str
    issued_at: datetime
    lines: list[Line]

    # TODO: make total_due a computed field, so it appears in dumps and in the serialization schema.
    @property
    def total_due(self) -> Decimal:
        """Sum of quantity times unit price over the lines."""
        return sum((line.quantity * line.unit_price for line in self.lines), Decimal("0"))


# TODO: JSON-compatible output (mode="json") with the camelCase aliases.
def export(invoice: Invoice) -> dict:
    """Return the invoice as JSON-compatible data with camelCase keys."""
    return json.loads(json.dumps(vars(invoice), default=str))


# TODO: read the property names from model_json_schema(mode=mode), not from the Python fields.
def schema_properties(model: type[BaseModel], mode: str = "validation") -> list[str]:
    """Return the sorted top-level property names of the model's JSON Schema."""
    return sorted(model.model_fields)
