import json
from dataclasses import dataclass
from typing import Literal, TypeIs, assert_never, overload


@overload
def parse(value: str, mode: Literal["json"]) -> dict[str, object]: ...
@overload
def parse(value: str, mode: Literal["text"]) -> str: ...
def parse(value: str, mode: str) -> dict[str, object] | str:
    """Decode a JSON object or clean up a line of text, depending on mode."""
    if mode == "json":
        data = json.loads(value)
        if not isinstance(data, dict):
            raise ValueError("json mode expects a JSON object")
        return data
    if mode == "text":
        return value.strip()
    raise ValueError(f"unknown mode: {mode!r}")


def is_str_list(value: object) -> TypeIs[list[str]]:
    """Whether value is a list whose items are all strings."""
    return isinstance(value, list) and all(isinstance(item, str) for item in value)


@dataclass(frozen=True)
class Created:
    id: int


@dataclass(frozen=True)
class Renamed:
    id: int
    name: str


@dataclass(frozen=True)
class Deleted:
    id: int


type Event = Created | Renamed | Deleted


def describe(event: Event) -> str:
    """One line for an audit log."""
    match event:
        case Created(id=item_id):
            return f"created {item_id}"
        case Renamed(id=item_id, name=name):
            return f"renamed {item_id} to {name}"
        case Deleted(id=item_id):
            return f"deleted {item_id}"
        case _:
            assert_never(event)
