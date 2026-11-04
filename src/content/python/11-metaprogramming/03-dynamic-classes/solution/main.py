import keyword
from collections.abc import Iterable
from typing import Any


def make_record_class(name: str, fields: Iterable[str]) -> type:
    """Build a slotted record class called `name` whose instances hold exactly `fields`."""
    field_names = tuple(fields)
    for field in field_names:
        if not field.isidentifier() or keyword.iskeyword(field):
            raise ValueError(f"invalid field name {field!r}")
    repeated = sorted({field for field in field_names if field_names.count(field) > 1})
    if repeated:
        raise ValueError(f"repeated field names: {', '.join(repeated)}")

    def __init__(self: Any, *args: Any, **kwargs: Any) -> None:
        if len(args) > len(field_names):
            raise TypeError(f"{name}() takes {len(field_names)} values but {len(args)} were given")
        values = dict(zip(field_names, args))
        for key, value in kwargs.items():
            if key not in field_names:
                raise TypeError(f"{name}() got an unknown field {key!r}")
            if key in values:
                raise TypeError(f"{name}() got two values for field {key!r}")
            values[key] = value
        missing = [field for field in field_names if field not in values]
        if missing:
            raise TypeError(f"{name}() is missing fields: {', '.join(missing)}")
        for field in field_names:
            setattr(self, field, values[field])

    def __repr__(self: Any) -> str:
        shown = ", ".join(f"{field}={getattr(self, field)!r}" for field in field_names)
        return f"{name}({shown})"

    def __eq__(self: Any, other: object) -> bool:
        if type(other) is not type(self):
            return NotImplemented
        return all(getattr(self, field) == getattr(other, field) for field in field_names)

    namespace = {
        "__slots__": field_names,
        "__match_args__": field_names,
        "__init__": __init__,
        "__repr__": __repr__,
        "__eq__": __eq__,
    }
    return type(name, (), namespace)
