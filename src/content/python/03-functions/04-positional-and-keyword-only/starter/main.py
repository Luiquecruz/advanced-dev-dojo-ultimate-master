import inspect
from collections.abc import Callable
from typing import Any


# TODO: make `host` positional-only and `ssl` and `timeout` keyword-only with the `/` and `*` markers.
def connect(host: str, port: int = 5432, ssl: bool = True, timeout: float | None = None) -> dict[str, Any]:
    return {"host": host, "port": port, "ssl": ssl, "timeout": timeout}


def describe_signature(function: Callable[..., Any]) -> dict[str, str]:
    # TODO: map each parameter name to its kind name ("POSITIONAL_ONLY", "KEYWORD_ONLY", ...)
    # using inspect.signature, in declaration order.
    return {}
