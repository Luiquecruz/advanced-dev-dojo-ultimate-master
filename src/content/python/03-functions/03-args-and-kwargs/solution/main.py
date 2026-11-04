from collections.abc import Callable
from typing import Any


def forward(function: Callable[..., Any], /, *args: Any, **kwargs: Any) -> tuple[Any, dict[str, Any]]:
    result = function(*args, **kwargs)
    return result, {"args": args, "kwargs": kwargs}


def retry_call(function: Callable[..., Any], /, *args: Any, attempts: int = 3, **kwargs: Any) -> Any:
    last_error: Exception | None = None
    for _ in range(attempts):
        try:
            return function(*args, **kwargs)
        except Exception as error:
            last_error = error
    if last_error is None:
        raise ValueError("attempts must be at least 1")
    raise last_error


def compose(*functions: Callable[[Any], Any]) -> Callable[[Any], Any]:
    def composed(value: Any) -> Any:
        for function in functions:
            value = function(value)
        return value

    return composed
