import functools
from collections import deque
from collections.abc import Callable
from typing import Any


class RateLimitError(Exception):
    pass


def rate_limit(max_calls: int, period: float, clock: Callable[[], float]) -> Callable[[Callable[..., Any]], Callable[..., Any]]:
    def decorator(function: Callable[..., Any]) -> Callable[..., Any]:
        accepted: deque[float] = deque()

        @functools.wraps(function)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            now = clock()
            while accepted and now - accepted[0] >= period:
                accepted.popleft()
            if len(accepted) >= max_calls:
                raise RateLimitError(f"{function.__name__}: more than {max_calls} calls in {period}s")
            accepted.append(now)
            return function(*args, **kwargs)

        return wrapper

    return decorator


def retry(
    function: Callable[..., Any] | None = None,
    /,
    *,
    times: int = 3,
    exceptions: tuple[type[BaseException], ...] = (Exception,),
) -> Any:
    def decorator(target: Callable[..., Any]) -> Callable[..., Any]:
        @functools.wraps(target)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            for attempt in range(1, times + 1):
                try:
                    return target(*args, **kwargs)
                except exceptions:
                    if attempt == times:
                        raise
            raise ValueError("times must be at least 1")

        return wrapper

    if function is not None:
        return decorator(function)
    return decorator
