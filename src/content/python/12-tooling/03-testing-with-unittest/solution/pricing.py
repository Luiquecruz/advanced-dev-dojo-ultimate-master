from rates import fetch_rate

BULK_THRESHOLD = 100
BULK_DISCOUNT_PERCENT = 10


class InvalidQuote(ValueError):
    """Raised for a quote that cannot be priced."""


def quote(unit_cents: int, quantity: int, currency: str = "USD") -> int:
    """Total price in cents of `quantity` units, converted from USD to `currency`."""
    if quantity <= 0:
        raise InvalidQuote(f"quantity must be at least 1, got {quantity}")
    if unit_cents < 0:
        raise InvalidQuote(f"unit price cannot be negative, got {unit_cents}")
    total = unit_cents * quantity
    if quantity >= BULK_THRESHOLD:
        total = total * (100 - BULK_DISCOUNT_PERCENT) // 100
    if currency != "USD":
        total = round(total * fetch_rate(currency))
    return total
