from pydantic import BaseModel, ConfigDict, StrictBool


class Order(BaseModel):
    model_config = ConfigDict(extra="forbid")

    order_id: int
    quantity: int
    unit_price: float
    express: bool = False
    paid: StrictBool


class StrictOrder(Order):
    model_config = ConfigDict(strict=True)


def parse_lax(data: dict) -> Order:
    """Validate a partner payload, converting compatible values."""
    return Order.model_validate(data)


def parse_strict(data: dict) -> StrictOrder:
    """Validate an internal message without any conversion."""
    return StrictOrder.model_validate(data)


def coercions(data: dict) -> dict[str, tuple[str, str]]:
    """Report which fields lax mode converted."""
    order = parse_lax(data)
    changed = {}
    for name, raw in data.items():
        parsed = getattr(order, name)
        if type(raw) is not type(parsed):
            changed[name] = (type(raw).__name__, type(parsed).__name__)
    return changed
