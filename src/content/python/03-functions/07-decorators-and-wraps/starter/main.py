import functools
from collections.abc import Callable
from typing import Any

ORDER: list[str] = []


def count_calls(function: Callable[..., Any]) -> Callable[..., Any]:
    # TODO: count every call in a `calls` attribute on the wrapper (starting at 0),
    # and copy the wrapped function's metadata with functools.wraps.
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        return function(*args, **kwargs)

    return wrapper


def require_positive(function: Callable[..., Any]) -> Callable[..., Any]:
    # TODO: raise ValueError when the first positional argument is missing or <= 0. Keep the metadata.
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        return function(*args, **kwargs)

    return wrapper


def first(function: Callable[..., Any]) -> Callable[..., Any]:
    # TODO: record "first" in ORDER when the wrapper is called, before calling the wrapped function.
    @functools.wraps(function)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        result = function(*args, **kwargs)
        ORDER.append("first")
        return result

    return wrapper


def second(function: Callable[..., Any]) -> Callable[..., Any]:
    # TODO: record "second" in ORDER when the wrapper is called, before calling the wrapped function.
    @functools.wraps(function)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        result = function(*args, **kwargs)
        ORDER.append("second")
        return result

    return wrapper


# TODO: calling job must record ["first", "second", "job"]. Stack the decorators so that happens.
@second
@first
def job(name: str) -> str:
    ORDER.append("job")
    return f"ran {name}"
