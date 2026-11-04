from decimal import ROUND_HALF_UP, Decimal, InvalidOperation
from fractions import Fraction

MAX_TEXT_LENGTH = 64
CENT = Decimal("0.01")


def split_bill(total_cents: int, people: int) -> list[int]:
    if not isinstance(total_cents, int):
        raise TypeError(f"total_cents must be an int, got {type(total_cents).__name__}")
    if total_cents < 0:
        raise ValueError("total_cents cannot be negative")
    if people < 1:
        raise ValueError("people must be at least 1")
    share, extra = divmod(total_cents, people)
    return [share + 1 if index < extra else share for index in range(people)]


def _check_length(text: str) -> None:
    if len(text) > MAX_TEXT_LENGTH:
        raise ValueError(f"number text longer than {MAX_TEXT_LENGTH} characters")


def round_money(value: str | int | Decimal) -> Decimal:
    if isinstance(value, float):
        raise TypeError("pass money as str, int or Decimal, never float")
    if isinstance(value, str):
        _check_length(value)
    try:
        amount = Decimal(value)
        if not amount.is_finite():
            raise ValueError(f"{value!r} is not a finite amount")
        return amount.quantize(CENT, rounding=ROUND_HALF_UP)
    except InvalidOperation:
        raise ValueError(f"{value!r} is not a valid amount") from None


def exact_ratio(text: str) -> Fraction:
    _check_length(text)
    try:
        return Fraction(text)
    except ZeroDivisionError:
        raise ValueError(f"{text!r} has a zero denominator") from None
