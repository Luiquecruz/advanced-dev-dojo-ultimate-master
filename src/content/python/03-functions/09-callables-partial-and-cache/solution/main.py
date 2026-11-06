from collections.abc import Callable
from functools import cached_property, lru_cache, singledispatch
from typing import Any

RATES = {"USD": 1.0, "EUR": 0.92, "GBP": 0.79, "JPY": 151.2}
LOOKUPS: list[str] = []


class Pipeline:
    def __init__(self, *steps: Callable[[Any], Any]) -> None:
        self._steps = steps

    def __call__(self, value: Any) -> Any:
        for step in self._steps:
            value = step(value)
        return value

    def then(self, step: Callable[[Any], Any]) -> "Pipeline":
        return Pipeline(*self._steps, step)

    @property
    def steps(self) -> tuple[Callable[[Any], Any], ...]:
        return self._steps


@singledispatch
def render(value: object) -> str:
    return f"<{type(value).__name__}>"


@render.register
def _(value: int) -> str:
    return f"#{value}"


@render.register
def _(value: list) -> str:
    return "[" + ", ".join([render(item) for item in value]) + "]"


@lru_cache(maxsize=2)
def exchange_rate(currency: str) -> float:
    LOOKUPS.append(currency)
    return RATES[currency]


class Report:
    def __init__(self, amounts: list[float]) -> None:
        self.amounts = amounts
        self.computations = 0

    @cached_property
    def total(self) -> float:
        self.computations += 1
        return sum(self.amounts)
