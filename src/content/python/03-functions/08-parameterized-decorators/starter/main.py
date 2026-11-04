import functools
from collections.abc import Callable
from typing import Any


class RateLimitError(Exception):
    pass


def rate_limit(max_calls: int, period: float, clock: Callable[[], float]) -> Callable[[Callable[..., Any]], Callable[..., Any]]:
    # TODO: return a decorator. Its wrapper keeps the times of accepted calls (read from `clock()`)
    # in its own closure, forgets the ones at least `period` old, and raises RateLimitError
    # instead of calling the function when `max_calls` calls are already inside the window.
    def decorator(function: Callable[..., Any]) -> Callable[..., Any]:
        return function

    return decorator


# TODO: support both forms, `@retry` and `@retry(times=2, exceptions=(ConnectionError,))`.
# `times` is the total number of attempts; only `exceptions` are retried; the last error is re-raised.
def retry(times: int = 3, exceptions: tuple[type[BaseException], ...] = (Exception,)) -> Any:
    def decorator(target: Callable[..., Any]) -> Callable[..., Any]:
        @functools.wraps(target)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            return target(*args, **kwargs)

        return wrapper

    return decorator
