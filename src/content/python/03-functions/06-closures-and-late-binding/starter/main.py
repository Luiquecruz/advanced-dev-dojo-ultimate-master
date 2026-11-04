from collections.abc import Callable, Iterable
from typing import Any


def make_handlers(names: Iterable[str]) -> list[Callable[[], str]]:
    # TODO: every lambda reads `name` when it is called, after the loop has finished.
    # Bind the current name per handler (a factory function, a default argument or functools.partial).
    return [lambda: f"hello {name}" for name in names]


def make_multipliers(factors: Iterable[float]) -> list[Callable[[float], float]]:
    # TODO: same late-binding bug with `factor`.
    multipliers = []
    for factor in factors:
        multipliers.append(lambda value: value * factor)
    return multipliers


def once(function: Callable[..., Any]) -> Callable[..., Any]:
    # TODO: call `function` on the first call only, remember its result in the closure (nonlocal),
    # and return that result on every later call. A call that raises caches nothing.
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        return function(*args, **kwargs)

    return wrapper
