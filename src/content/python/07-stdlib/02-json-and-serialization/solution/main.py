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
        if isinstance(o, datetime.date):
            return o.isoformat()
        if isinstance(o, Decimal):
            return str(o)
        if dataclasses.is_dataclass(o) and not isinstance(o, type):
            return dataclasses.asdict(o)
        return super().default(o)


def dumps_stable(value: Any) -> str:
    return json.dumps(value, cls=DojoEncoder, sort_keys=True, separators=(",", ":"), allow_nan=False)


def _reject_constant(name: str) -> None:
    raise ValueError(f"{name} is not valid JSON")


def loads_with_decimals(text: str) -> Any:
    return json.loads(text, parse_float=Decimal, parse_constant=_reject_constant)
