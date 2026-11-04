from decimal import ROUND_HALF_UP, Decimal, InvalidOperation
from fractions import Fraction

MAX_TEXT_LENGTH = 64
CENT = Decimal("0.01")


def split_bill(total_cents: int, people: int) -> list[int]:
    # TODO: validate the arguments, then split with divmod so the shares are ints that sum exactly
    # to total_cents, giving the extra cents to the first people.
    share = round(total_cents / people)
    return [share] * people


def round_money(value: str | int | Decimal) -> Decimal:
    # TODO: refuse floats (TypeError) and oversized or non-finite text (ValueError), then build a
    # Decimal and quantize it to CENT with ROUND_HALF_UP.
    return Decimal(round(float(value), 2))


def exact_ratio(text: str) -> Fraction:
    # TODO: check the length, then build the Fraction from the text itself, not from a float.
    # A zero denominator must raise ValueError.
    return Fraction(float(text))
