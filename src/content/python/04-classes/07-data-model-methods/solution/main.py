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

    def __repr__(self) -> str:
        return f"{type(self).__name__}({self.cents!r}, {self.currency!r})"

    def __str__(self) -> str:
        return format(self, ".2f")

    def __format__(self, spec: str) -> str:
        return f"{format(self.cents / 100, spec or '.2f')} {self.currency}"

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Money):
            return NotImplemented
        return (self.cents, self.currency) == (other.cents, other.currency)

    def __hash__(self) -> int:
        return hash((self.cents, self.currency))

    def __lt__(self, other: object) -> bool:
        if not isinstance(other, Money):
            return NotImplemented
        self._check_currency(other)
        return self.cents < other.cents

    def __bool__(self) -> bool:
        return self.cents != 0

    def __add__(self, other: object) -> Money:
        if not isinstance(other, Money):
            return NotImplemented
        self._check_currency(other)
        return Money(self.cents + other.cents, self.currency)

    def __radd__(self, other: object) -> Money:
        if other == 0 and not isinstance(other, bool):
            return self
        return NotImplemented

    def _check_currency(self, other: Money) -> None:
        if other.currency != self.currency:
            raise TypeError(f"cannot combine {self.currency} with {other.currency}")
