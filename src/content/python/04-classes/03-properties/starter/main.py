ABSOLUTE_ZERO = -273.15


class Temperature:
    """A temperature stored in Celsius and exposed in three scales."""

    def __init__(self, celsius: float = 0.0) -> None:
        # TODO: turn celsius into a property (getter, validating setter, deleter that resets to 0.0).
        self.celsius = celsius

    @property
    def fahrenheit(self) -> float:
        # TODO: convert from Celsius, and add a setter that goes through the celsius validation.
        return 0.0

    @property
    def kelvin(self) -> float:
        # TODO: convert from Celsius. Keep kelvin read-only.
        return 0.0

    def __repr__(self) -> str:
        return f"Temperature({self.celsius!r})"
