import inspect
from collections.abc import Callable, Mapping
from typing import Any


def call_with(function: Callable[..., Any], available: Mapping[str, Any]) -> Any:
    """Call `function` with the values from `available` whose names match its declared parameters."""
    # TODO: read the parameters with inspect.signature, which follows decorators (__wrapped__), partials
    # and callable objects; pass annotation_format=annotationlib.Format.FORWARDREF so annotations naming
    # classes that do not exist yet cannot raise NameError. Pass positional-only parameters by position
    # and the others by keyword, skip *args and **kwargs, and raise TypeError naming a required
    # parameter that is not available.
    code = function.__code__
    names = code.co_varnames[: code.co_argcount]
    return function(**{name: available[name] for name in names if name in available})


def public_api(cls: type) -> list[tuple[str, str]]:
    """List `(name, kind)` for the public methods, classmethods and staticmethods of `cls`, sorted by name."""
    # TODO: getattr() unwraps classmethod and staticmethod. Read each raw attribute with
    # inspect.getattr_static and report its kind: "method", "classmethod" or "staticmethod".
    functions = inspect.getmembers(cls, inspect.isfunction)
    return sorted((name, "method") for name, _ in functions if not name.startswith("_"))


def is_async(function: object) -> bool:
    """Tell whether calling `function` returns a coroutine, without calling it."""
    # TODO: True for coroutine functions, async methods, partials of them and objects whose __call__
    # is async; False for classes and everything else. Never call the function to find out.
    return False
