ABSOLUTE_ZERO = -273.15


class Temperature:
    """A temperature stored in Celsius and exposed in three scales."""

    def __init__(self, celsius: float = 0.0) -> None:
        self.celsius = celsius

    @property
    def celsius(self) -> float:
        return self._celsius

    @celsius.setter
    def celsius(self, value: float) -> None:
        if value < ABSOLUTE_ZERO:
            raise ValueError(f"temperature below absolute zero: {value} C")
        self._celsius = float(value)

    @celsius.deleter
    def celsius(self) -> None:
        self._celsius = 0.0

    @property
    def fahrenheit(self) -> float:
        return self._celsius * 9 / 5 + 32

    @fahrenheit.setter
    def fahrenheit(self, value: float) -> None:
        self.celsius = (value - 32) * 5 / 9

    @property
    def kelvin(self) -> float:
        return self._celsius - ABSOLUTE_ZERO

    def __repr__(self) -> str:
        return f"Temperature({self._celsius!r})"
