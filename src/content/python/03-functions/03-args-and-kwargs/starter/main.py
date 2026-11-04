from collections.abc import Callable
from typing import Any


def forward(function: Callable[..., Any], /, *args: Any, **kwargs: Any) -> tuple[Any, dict[str, Any]]:
    # TODO: call `function` with the same positional and keyword arguments it was given (unpack them),
    # and return (result, {"args": args, "kwargs": kwargs}).
    result = function(args, kwargs)
    return result, {"args": list(args), "kwargs": kwargs}


def retry_call(function: Callable[..., Any], /, *args: Any, attempts: int = 3, **kwargs: Any) -> Any:
    # TODO: call `function` up to `attempts` times, forwarding everything except `attempts`.
    # Return the first successful result; if every attempt fails, re-raise the last error.
    return function(*args, attempts=attempts, **kwargs)


def compose(*functions: Callable[[Any], Any]) -> Callable[[Any], Any]:
    # TODO: return a one-argument function that applies `functions` left to right.
    # With no functions it returns its argument unchanged.
    def composed(value: Any) -> Any:
        return value

    return composed
