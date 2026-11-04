from collections.abc import Callable, Iterable
from typing import Any


def make_greeter(name: str) -> Callable[[], str]:
    def greet() -> str:
        return f"hello {name}"

    return greet


def make_handlers(names: Iterable[str]) -> list[Callable[[], str]]:
    return [make_greeter(name) for name in names]


def make_multipliers(factors: Iterable[float]) -> list[Callable[[float], float]]:
    return [lambda value, factor=factor: value * factor for factor in factors]


def once(function: Callable[..., Any]) -> Callable[..., Any]:
    called = False
    result: Any = None

    def wrapper(*args: Any, **kwargs: Any) -> Any:
        nonlocal called, result
        if not called:
            result = function(*args, **kwargs)
            called = True
        return result

    return wrapper
