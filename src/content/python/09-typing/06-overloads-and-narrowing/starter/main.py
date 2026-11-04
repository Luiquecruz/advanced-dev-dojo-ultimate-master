import json
from dataclasses import dataclass


# TODO: add two @overload signatures above the implementation:
# mode Literal["json"] returns dict[str, object], mode Literal["text"] returns str.
# TODO: reject a JSON value that is not an object, and any other mode, with ValueError.
def parse(value: str, mode: str) -> dict[str, object] | str:
    """Decode a JSON object or clean up a line of text, depending on mode."""
    if mode == "json":
        return json.loads(value)
    return value.strip()


# TODO: annotate the result as TypeIs[list[str]] and accept only real lists.
def is_str_list(value: object) -> bool:
    """Whether value is a list whose items are all strings."""
    return all(isinstance(item, str) for item in value)


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


# TODO: handle Deleted, and end with typing.assert_never for anything outside Event.
def describe(event: Event) -> str:
    """One line for an audit log."""
    match event:
        case Created(id=item_id):
            return f"created {item_id}"
        case Renamed(id=item_id, name=name):
            return f"renamed {item_id} to {name}"
        case _:
            return "unknown event"
