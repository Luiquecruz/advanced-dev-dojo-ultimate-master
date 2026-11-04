import functools
from collections.abc import Callable
from typing import Any

ORDER: list[str] = []


def count_calls(function: Callable[..., Any]) -> Callable[..., Any]:
    @functools.wraps(function)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        wrapper.calls += 1
        return function(*args, **kwargs)

    wrapper.calls = 0
    return wrapper


def require_positive(function: Callable[..., Any]) -> Callable[..., Any]:
    @functools.wraps(function)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        if not args or args[0] <= 0:
            raise ValueError(f"{function.__name__} needs a positive first argument")
        return function(*args, **kwargs)

    return wrapper


def first(function: Callable[..., Any]) -> Callable[..., Any]:
    @functools.wraps(function)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        ORDER.append("first")
        return function(*args, **kwargs)

    return wrapper


def second(function: Callable[..., Any]) -> Callable[..., Any]:
    @functools.wraps(function)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        ORDER.append("second")
        return function(*args, **kwargs)

    return wrapper


@first
@second
def job(name: str) -> str:
    ORDER.append("job")
    return f"ran {name}"
