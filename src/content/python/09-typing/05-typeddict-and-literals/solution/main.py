from typing import Literal, NotRequired, ReadOnly, TypedDict, get_args, get_origin, get_type_hints


class UserPayload(TypedDict):
    id: ReadOnly[int]
    name: str
    role: Literal["admin", "editor", "viewer"]
    tags: NotRequired[list[str]]


def has_type(value: object, expected: object) -> bool:
    """Whether value fits a str, int or list[...] annotation."""
    if expected is str:
        return isinstance(value, str)
    if expected is int:
        return isinstance(value, int) and not isinstance(value, bool)
    if get_origin(expected) is list:
        (item_type,) = get_args(expected)
        return isinstance(value, list) and all(has_type(item, item_type) for item in value)
    raise TypeError(f"unsupported annotation: {expected!r}")


def check_value(key: str, value: object, expected: object) -> str | None:
    """Return the error for one present key, or None when the value fits."""
    if get_origin(expected) is Literal:
        return None if value in get_args(expected) else f"{key}: not allowed"
    return None if has_type(value, expected) else f"{key}: wrong type"


def validate_payload(data: dict[str, object], schema: type) -> list[str]:
    """Check data against a TypedDict class and return the error messages."""
    hints = get_type_hints(schema)
    errors = []
    for key, expected in hints.items():
        if key not in data:
            if key in schema.__required_keys__:
                errors.append(f"{key}: missing")
            continue
        error = check_value(key, data[key], expected)
        if error is not None:
            errors.append(error)
    errors += [f"{key}: unknown key" for key in data if key not in hints]
    return errors
