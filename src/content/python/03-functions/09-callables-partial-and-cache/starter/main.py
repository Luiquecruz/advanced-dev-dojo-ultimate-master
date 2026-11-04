from collections.abc import Callable
from functools import cached_property, lru_cache, singledispatch
from typing import Any

RATES = {"USD": 1.0, "EUR": 0.92, "GBP": 0.79, "JPY": 151.2}
LOOKUPS: list[str] = []


class Pipeline:
    def __init__(self, *steps: Callable[[Any], Any]) -> None:
        self._steps = list(steps)

    # TODO: make instances callable with __call__(self, value): apply every step in order.

    def then(self, step: Callable[[Any], Any]) -> "Pipeline":
        # TODO: return a NEW Pipeline with `step` appended; never change self.
        self._steps.append(step)
        return self

    @property
    def steps(self) -> tuple[Callable[[Any], Any], ...]:
        return tuple(self._steps)


# TODO: turn render into a functools.singledispatch function: the fallback returns f"<{type name}>",
# an int handler returns f"#{value}", and a list handler renders each item and joins them in brackets.
def render(value: object) -> str:
    if type(value) is int:
        return f"#{value}"
    return f"<{type(value).__name__}>"


# TODO: cache at most two currencies with functools.lru_cache(maxsize=2).
def exchange_rate(currency: str) -> float:
    LOOKUPS.append(currency)
    return RATES[currency]


class Report:
    def __init__(self, amounts: list[float]) -> None:
        self.amounts = amounts
        self.computations = 0

    # TODO: compute total once per instance with functools.cached_property.
    @property
    def total(self) -> float:
        self.computations += 1
        return sum(self.amounts)
