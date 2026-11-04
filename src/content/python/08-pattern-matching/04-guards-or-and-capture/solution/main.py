from dataclasses import dataclass
from enum import StrEnum
from typing import Any


class Role(StrEnum):
    GUEST = "guest"
    EDITOR = "editor"
    ADMIN = "admin"


@dataclass(frozen=True)
class Request:
    method: str
    path: tuple[str | int, ...]
    role: Role = Role.GUEST


def route(request: Request) -> tuple[str, dict[str, Any]]:
    """Pick the handler name and its arguments for one request."""
    match request:
        case Request("GET" | "HEAD", ("users",)):
            return ("list_users", {})
        case Request("GET" | "HEAD", ("v1" | "v2" as version, "users")):
            return ("list_users", {"version": version})
        case Request("GET" | "HEAD", ("users", int(user_id))):
            return ("show_user", {"user_id": user_id})
        case Request("PUT" | "PATCH" as method, ("users", int(user_id)), role) if role in (Role.EDITOR, Role.ADMIN):
            return ("update_user", {"user_id": user_id, "method": method})
        case Request("DELETE", ("users", int(user_id)), Role.ADMIN):
            return ("delete_user", {"user_id": user_id})
        case Request("PUT" | "PATCH" | "DELETE", ("users", int(user_id))):
            return ("forbidden", {"user_id": user_id})
        case _:
            return ("not_found", {})
