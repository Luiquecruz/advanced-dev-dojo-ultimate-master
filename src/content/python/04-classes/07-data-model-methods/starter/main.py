from functools import total_ordering
from typing import Self


@total_ordering
class Money:
    """An amount in cents of one currency."""

    __slots__ = ("cents", "currency")

    def __init__(self, cents: int, currency: str) -> None:
        self.cents = cents
        self.currency = currency.upper()

    @classmethod
    def zero(cls, currency: str) -> Self:
        return cls(0, currency)

    # TODO: __repr__ returning "Money(1050, 'EUR')", __str__ and __format__ returning "10.50 EUR".

    def __eq__(self, other: object) -> bool:
        # TODO: compare cents and currency, return NotImplemented for non-Money, and define a matching __hash__.
        return self.cents == other.cents

    def __lt__(self, other: object) -> bool:
        # TODO: return NotImplemented for non-Money and raise TypeError across currencies.
        return self.cents < other.cents

    # TODO: __bool__ (zero is falsy), __add__ (same currency only, NotImplemented for non-Money) and __radd__ for sum().
