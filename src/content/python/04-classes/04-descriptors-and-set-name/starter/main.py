from collections.abc import Callable
from typing import Any


class Positive:
    """Data descriptor that accepts only numbers greater than zero."""

    def __set_name__(self, owner: type, name: str) -> None:
        self.name = name

    def __get__(self, instance: object | None, owner: type | None = None) -> Any:
        # TODO: return the descriptor itself on class access, and read the value from the instance.
        return self.value

    def __set__(self, instance: object, value: float) -> None:
        if value <= 0:
            raise ValueError(f"{self.name} must be positive, got {value!r}")
        # TODO: this value is shared by every instance of the owner class. Store it on the instance.
        self.value = value


class LazyAttribute:
    """Non-data descriptor that computes a value once and caches it on the instance."""

    def __init__(self, function: Callable[[Any], Any]) -> None:
        self.function = function
        self.name = function.__name__

    def __get__(self, instance: object | None, owner: type | None = None) -> Any:
        # TODO: return self on class access; otherwise compute once and cache the result in the instance __dict__.
        return self.function(instance)


class Field:
    """Data descriptor that validates an inclusive numeric range and names the attribute in errors."""

    def __init__(self, min_value: float | None = None, max_value: float | None = None) -> None:
        self.min_value = min_value
        self.max_value = max_value
        self.name = "field"

    # TODO: add __set_name__(self, owner, name) so the descriptor knows its attribute name.

    def __get__(self, instance: object | None, owner: type | None = None) -> Any:
        if instance is None:
            return self
        try:
            return instance.__dict__[self.name]
        except KeyError:
            raise AttributeError(f"{self.name} has no value") from None

    def __set__(self, instance: object, value: float) -> None:
        if self.min_value is not None and value < self.min_value:
            raise ValueError(f"{self.name} must be >= {self.min_value}, got {value!r}")
        if self.max_value is not None and value > self.max_value:
            raise ValueError(f"{self.name} must be <= {self.max_value}, got {value!r}")
        instance.__dict__[self.name] = value


class Model:
    """Base class whose subclasses declare Field descriptors."""

    def __init__(self, **values: Any) -> None:
        known = self.fields()
        for name, value in values.items():
            if name not in known:
                raise TypeError(f"{type(self).__name__} has no field {name!r}")
            setattr(self, name, value)

    @classmethod
    def fields(cls) -> list[str]:
        # TODO: names of the Field descriptors of cls and its bases, in definition order (base fields first).
        return []
