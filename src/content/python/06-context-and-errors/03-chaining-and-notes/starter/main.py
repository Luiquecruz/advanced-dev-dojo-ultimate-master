import functools
import json
from collections.abc import Callable
from typing import Any


class ConfigError(Exception):
    """Raised when a configuration cannot be loaded or read."""


def load_config(text: str) -> dict[str, Any]:
    # TODO: raise ConfigError with the decode error as its explicit cause (keep "line" in the
    # message), and reject valid JSON that is not an object with ConfigError.
    try:
        return json.loads(text)
    except json.JSONDecodeError as error:
        raise ConfigError(f"config is not valid JSON: {error}")


def reraise_hidden(function: Callable[..., Any]) -> Callable[..., Any]:
    # TODO: when the function raises KeyError, raise ConfigError("missing setting: <key>") instead
    # and hide the KeyError from the printed traceback. Other exceptions pass through unchanged.
    @functools.wraps(function)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        return function(*args, **kwargs)

    return wrapper


def annotate(error: BaseException, **context: Any) -> BaseException:
    # TODO: add one note "key=value" per keyword, in sorted key order, without touching the
    # message, and return the same exception object.
    return error
