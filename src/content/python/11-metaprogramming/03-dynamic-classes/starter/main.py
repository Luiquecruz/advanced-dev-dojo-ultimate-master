import keyword
from collections.abc import Iterable
from typing import Any


def make_record_class(name: str, fields: Iterable[str]) -> type:
    """Build a slotted record class called `name` whose instances hold exactly `fields`."""
    field_names = tuple(fields)
    # TODO: raise ValueError for a field name that is not an identifier, is a keyword or is repeated.

    def __init__(self: Any, **values: Any) -> None:
        # TODO: accept the fields by position or keyword. Raise TypeError naming the field for
        # unknown, missing or repeated values, and for more positional values than fields.
        for key, value in values.items():
            setattr(self, key, value)

    def __repr__(self: Any) -> str:
        # TODO: return "Name(field=value, ...)" with the repr of each value, in field order.
        return f"<{name} record>"

    # TODO: add __eq__: equal only to an instance of the same class with equal field values.

    namespace = {"__init__": __init__, "__repr__": __repr__}
    # TODO: add __slots__ and __match_args__, and create the class under the requested name.
    return type("Record", (), namespace)
