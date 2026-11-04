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


_CACHE: dict[Hashable, Any] = {}


def cached(store: MutableMapping[Hashable, Any]) -> Decorator:
    # TODO: keep entries in the injected `store`, not in the module-level _CACHE shared by every client.
    def decorator(function: Call) -> Call:
        @functools.wraps(function)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            key = cache_key(args, kwargs)
            if key not in _CACHE:
                _CACHE[key] = function(*args, **kwargs)
            return _CACHE[key]

        return wrapper

    return decorator


def measured(metrics: list[dict[str, Any]], clock: Callable[[], float]) -> Decorator:
    # TODO: append one sample {"name", "elapsed", "ok"} to `metrics` per call, timed with `clock`,
    # also when the call raises (ok=False, then re-raise). Preserve metadata with functools.wraps.
    def decorator(function: Call) -> Call:
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            return function(*args, **kwargs)

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
    # TODO: on AuthExpired, call tokens.refresh() once and retry the inner call once with the new token.
    def decorator(function: Call) -> Call:
        @functools.wraps(function)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            return function(*args, token=tokens.current(), **kwargs)

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
    # TODO: the order must be cache -> metrics -> retry -> auth, outermost first.
    authorized = authenticated(tokens)(call)
    timed = measured(metrics, clock)(authorized)
    resilient = retried(3, (ConnectionError,))(timed)
    return cached(store)(resilient)
