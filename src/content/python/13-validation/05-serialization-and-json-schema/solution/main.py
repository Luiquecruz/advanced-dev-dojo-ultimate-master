from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, computed_field
from pydantic.alias_generators import to_camel

WIRE_FORMAT = ConfigDict(alias_generator=to_camel, validate_by_name=True, validate_by_alias=True, extra="forbid")


class Line(BaseModel):
    model_config = WIRE_FORMAT

    sku: str
    quantity: int = Field(gt=0)
    unit_price: Decimal = Field(ge=0)


class Invoice(BaseModel):
    model_config = WIRE_FORMAT

    invoice_id: str
    issued_at: datetime
    lines: list[Line]

    @computed_field
    @property
    def total_due(self) -> Decimal:
        """Sum of quantity times unit price over the lines."""
        return sum((line.quantity * line.unit_price for line in self.lines), Decimal("0"))


def export(invoice: Invoice) -> dict:
    """Return the invoice as JSON-compatible data with camelCase keys."""
    return invoice.model_dump(mode="json", by_alias=True)


def schema_properties(model: type[BaseModel], mode: str = "validation") -> list[str]:
    """Return the sorted top-level property names of the model's JSON Schema."""
    return sorted(model.model_json_schema(mode=mode)["properties"])
