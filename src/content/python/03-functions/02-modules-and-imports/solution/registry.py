from collections.abc import Callable

HANDLERS: list[Callable[[], str]] = []


def register(function: Callable[[], str]) -> Callable[[], str]:
    HANDLERS.append(function)
    return function


@register
def ping() -> str:
    return "pong"


@register
def health() -> str:
    return "ok"
