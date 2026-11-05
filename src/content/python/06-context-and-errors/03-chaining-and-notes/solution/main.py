import functools
import json
from collections.abc import Callable
from typing import Any


class ConfigError(Exception):
    """Raised when a configuration cannot be loaded or read."""


def load_config(text: str) -> dict[str, Any]:
    try:
        config = json.loads(text)
    except json.JSONDecodeError as error:
        raise ConfigError(f"config is not valid JSON (line {error.lineno}, column {error.colno})") from error
    if not isinstance(config, dict):
        raise ConfigError("config must be a JSON object")
    return config


def reraise_hidden(function: Callable[..., Any]) -> Callable[..., Any]:
    @functools.wraps(function)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        try:
            return function(*args, **kwargs)
        except KeyError as error:
            raise ConfigError(f"missing setting: {error.args[0]}") from None

    return wrapper


def annotate(error: BaseException, **context: Any) -> BaseException:
    for key in sorted(context):
        error.add_note(f"{key}={context[key]}")
    return error
