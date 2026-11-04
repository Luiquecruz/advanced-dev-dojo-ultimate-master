import functools
from collections.abc import Callable, Hashable, MutableMapping
from typing import Any, Protocol

Call = Callable[..., Any]
Decorator = Callable[[Call], Call]


class AuthExpired(Exception):
    pass


class TokenSource(Protocol):
    def current(self) -> str: ...

    def refresh(self) -> str: ...


def cache_key(args: tuple[Any, ...], kwargs: dict[str, Any]) -> Hashable:
    return args, tuple(sorted(kwargs.items()))


def cached(store: MutableMapping[Hashable, Any]) -> Decorator:
    def decorator(function: Call) -> Call:
        @functools.wraps(function)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            key = cache_key(args, kwargs)
            if key in store:
                return store[key]
            result = function(*args, **kwargs)
            store[key] = result
            return result

        return wrapper

    return decorator


def measured(metrics: list[dict[str, Any]], clock: Callable[[], float]) -> Decorator:
    def decorator(function: Call) -> Call:
        @functools.wraps(function)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            start = clock()
            ok = False
            try:
                result = function(*args, **kwargs)
                ok = True
                return result
            finally:
                metrics.append({"name": function.__name__, "elapsed": clock() - start, "ok": ok})

        return wrapper

    return decorator


def retried(times: int, exceptions: tuple[type[BaseException], ...]) -> Decorator:
    def decorator(function: Call) -> Call:
        @functools.wraps(function)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            for attempt in range(1, times + 1):
                try:
                    return function(*args, **kwargs)
                except exceptions:
                    if attempt == times:
                        raise
            raise ValueError("times must be at least 1")

        return wrapper

    return decorator


def authenticated(tokens: TokenSource) -> Decorator:
    def decorator(function: Call) -> Call:
        @functools.wraps(function)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            try:
                return function(*args, token=tokens.current(), **kwargs)
            except AuthExpired:
                return function(*args, token=tokens.refresh(), **kwargs)

        return wrapper

    return decorator


def build_client(
    call: Call,
    *,
    store: MutableMapping[Hashable, Any],
    metrics: list[dict[str, Any]],
    tokens: TokenSource,
    clock: Callable[[], float],
) -> Call:
    outermost_first = [
        cached(store),
        measured(metrics, clock),
        retried(3, (ConnectionError,)),
        authenticated(tokens),
    ]
    client = call
    for layer in reversed(outermost_first):
        client = layer(client)
    return client
