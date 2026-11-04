import inspect
from annotationlib import Format
from collections.abc import Callable, Mapping
from typing import Any

Parameter = inspect.Parameter
VARIADIC = (Parameter.VAR_POSITIONAL, Parameter.VAR_KEYWORD)


def call_with(function: Callable[..., Any], available: Mapping[str, Any]) -> Any:
    """Call `function` with the values from `available` whose names match its declared parameters."""
    args: list[Any] = []
    kwargs: dict[str, Any] = {}
    signature = inspect.signature(function, annotation_format=Format.FORWARDREF)
    for parameter in signature.parameters.values():
        if parameter.kind in VARIADIC:
            continue
        provided = parameter.name in available
        if not provided and parameter.default is Parameter.empty:
            label = getattr(function, "__qualname__", type(function).__name__)
            raise TypeError(f"cannot call {label}: required parameter {parameter.name!r} is not available")
        if parameter.kind is Parameter.POSITIONAL_ONLY:
            args.append(available[parameter.name] if provided else parameter.default)
        elif provided:
            kwargs[parameter.name] = available[parameter.name]
    return function(*args, **kwargs)


def public_api(cls: type) -> list[tuple[str, str]]:
    """List `(name, kind)` for the public methods, classmethods and staticmethods of `cls`, sorted by name."""
    entries: list[tuple[str, str]] = []
    for name in dir(cls):
        if name.startswith("_"):
            continue
        raw = inspect.getattr_static(cls, name)
        if isinstance(raw, staticmethod):
            entries.append((name, "staticmethod"))
        elif isinstance(raw, classmethod):
            entries.append((name, "classmethod"))
        elif inspect.isfunction(raw):
            entries.append((name, "method"))
    return sorted(entries)


def is_async(function: object) -> bool:
    """Tell whether calling `function` returns a coroutine, without calling it."""
    if inspect.iscoroutinefunction(function):
        return True
    if inspect.isclass(function):
        return False
    return inspect.iscoroutinefunction(getattr(type(function), "__call__", None))
