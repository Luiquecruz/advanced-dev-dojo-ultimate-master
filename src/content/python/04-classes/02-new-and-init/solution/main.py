from typing import Self


class Currency:
    """A currency interned by its upper-case code."""

    _instances: dict[str, Currency] = {}

    def __new__(cls, code: str) -> Self:
        key = code.upper()
        instance = cls._instances.get(key)
        if instance is None:
            instance = super().__new__(cls)
            instance.code = key
            instance.rates = {}
            instance.init_calls = 0
            cls._instances[key] = instance
        return instance

    def __init__(self, code: str) -> None:
        self.init_calls += 1

    def __repr__(self) -> str:
        return f"Currency({self.code!r})"


class Percent(float):
    """A float between 0 and 100, built from a number or a string such as "12.5%"."""

    def __new__(cls, value: float | str) -> Self:
        if isinstance(value, str):
            value = value.strip().removesuffix("%")
        number = float(value)
        if not 0 <= number <= 100:
            raise ValueError(f"percent must be between 0 and 100, got {number}")
        return super().__new__(cls, number)
