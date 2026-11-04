from dataclasses import dataclass
from typing import Any

DEFAULT_HEADERS = {"Accept": "application/json", "User-Agent": "dojo-client"}


# TODO: the default list is created once, when `def` runs, and shared by every call. Use a None sentinel.
def add_tag(tag: str, tags: list[str] = []) -> list[str]:
    tags.append(tag)
    return tags


class Registry:
    # TODO: same bug in a constructor. Every Registry() shares one dict; also copy a dict passed in.
    def __init__(self, items: dict[str, Any] = {}) -> None:
        self.items = items

    def register(self, name: str, value: Any) -> None:
        self.items[name] = value


@dataclass
class Settings:
    name: str = "default"
    # TODO: give each instance its own empty list and dict with dataclasses.field(default_factory=...).
    tags: list[str] | None = None
    limits: dict[str, int] | None = None


# TODO: None must mean "send no headers" and an omitted argument "use a copy of DEFAULT_HEADERS".
# Use a private sentinel object as the default so the two cases can be told apart.
def request(path: str, headers: dict[str, str] | None = None) -> dict[str, Any]:
    if headers is None:
        headers = DEFAULT_HEADERS
    return {"path": path, "headers": headers}
