from typing import Self


class Currency:
    """A currency interned by its upper-case code."""

    # TODO: keep one instance per upper-case code and return it from __new__(cls, code) -> Self.
    def __init__(self, code: str) -> None:
        # TODO: __init__ runs again when __new__ returns a cached instance: count the call, never reset state here.
        self.code = code
        self.rates = {}
        self.init_calls = 1

    def __repr__(self) -> str:
        return f"Currency({self.code!r})"


class Percent(float):
    """A float between 0 and 100, built from a number or a string such as "12.5%"."""

    # TODO: define __new__(cls, value) -> Self: strip a trailing "%" from strings, check 0 <= number <= 100, build the float.
