from pydantic import BaseModel, ConfigDict, StrictBool


# TODO: make `paid` strict even in this lax model, so "true", 1 and "yes" are rejected.
class Order(BaseModel):
    model_config = ConfigDict(extra="forbid")

    order_id: int
    quantity: int
    unit_price: float
    express: bool = False
    paid: bool


# TODO: turn on strict mode for every field through model_config.
class StrictOrder(Order):
    pass


def parse_lax(data: dict) -> Order:
    """Validate a partner payload, converting compatible values."""
    return Order.model_validate(data)


# TODO: validate with StrictOrder; checking the attributes after a lax parse sees only converted values.
def parse_strict(data: dict) -> StrictOrder:
    """Validate an internal message without any conversion."""
    order = Order.model_validate(data)
    if not isinstance(order.order_id, int):
        raise TypeError("order_id must be an int")
    return order


# TODO: return {field: (input type name, output type name)} for the fields whose type changed.
def coercions(data: dict) -> dict[str, tuple[str, str]]:
    """Report which fields lax mode converted."""
    return {}
