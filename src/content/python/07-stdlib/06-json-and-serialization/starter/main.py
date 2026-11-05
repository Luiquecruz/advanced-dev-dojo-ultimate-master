import dataclasses
import datetime
import json
from decimal import Decimal
from typing import Any


@dataclasses.dataclass
class Line:
    description: str
    amount: Decimal


@dataclasses.dataclass
class Invoice:
    number: str
    issued_at: datetime.datetime
    lines: list[Line]


class DojoEncoder(json.JSONEncoder):
    """Encodes datetimes as ISO text, Decimals as strings and dataclass instances as objects."""

    def default(self, o: Any) -> Any:
        # TODO: datetime/date -> isoformat(), Decimal -> str(), dataclass instance -> dataclasses.asdict().
        # Everything else must still reach the base class, which raises TypeError.
        return super().default(o)


def dumps_stable(value: Any) -> str:
    # TODO: use DojoEncoder, sort the keys, compact separators (",", ":") and reject NaN/Infinity.
    return json.dumps(value)


def loads_with_decimals(text: str) -> Any:
    # TODO: build Decimals from the original digits (not from floats) and reject NaN/Infinity.
    return json.loads(text)
