from dataclasses import dataclass, field
from typing import Any

DEFAULT_HEADERS = {"Accept": "application/json", "User-Agent": "dojo-client"}

_UNSET: Any = object()


def add_tag(tag: str, tags: list[str] | None = None) -> list[str]:
    if tags is None:
        tags = []
    tags.append(tag)
    return tags


class Registry:
    def __init__(self, items: dict[str, Any] | None = None) -> None:
        self.items: dict[str, Any] = {} if items is None else dict(items)

    def register(self, name: str, value: Any) -> None:
        self.items[name] = value


@dataclass
class Settings:
    name: str = "default"
    tags: list[str] = field(default_factory=list)
    limits: dict[str, int] = field(default_factory=dict)


def request(path: str, headers: dict[str, str] | None = _UNSET) -> dict[str, Any]:
    if headers is _UNSET:
        chosen = dict(DEFAULT_HEADERS)
    elif headers is None:
        chosen = {}
    else:
        chosen = dict(headers)
    return {"path": path, "headers": chosen}
