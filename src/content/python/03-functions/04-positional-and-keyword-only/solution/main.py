import inspect
from collections.abc import Callable
from typing import Any


def connect(host: str, /, port: int = 5432, *, ssl: bool = True, timeout: float | None = None) -> dict[str, Any]:
    return {"host": host, "port": port, "ssl": ssl, "timeout": timeout}


def describe_signature(function: Callable[..., Any]) -> dict[str, str]:
    parameters = inspect.signature(function).parameters
    return {name: parameter.kind.name for name, parameter in parameters.items()}
