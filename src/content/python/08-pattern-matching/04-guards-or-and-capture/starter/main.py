from dataclasses import dataclass
from enum import StrEnum
from typing import Any


class Role(StrEnum):
    GUEST = "guest"
    EDITOR = "editor"
    ADMIN = "admin"


ADMIN = Role.ADMIN


@dataclass(frozen=True)
class Request:
    method: str
    path: tuple[str | int, ...]
    role: Role = Role.GUEST


def route(request: Request) -> tuple[str, dict[str, Any]]:
    """Pick the handler name and its arguments for one request."""
    match request:
        # TODO: accept HEAD as well as GET with an or-pattern, in every read route below.
        case Request("GET", ("users",)):
            return ("list_users", {})
        # TODO: GET/HEAD ("v1" or "v2", "users") -> ("list_users", {"version": ...}), capturing the prefix with `as`.
        case Request("GET", ("users", int(user_id))):
            return ("show_user", {"user_id": user_id})
        # TODO: PUT or PATCH ("users", id) for editors and admins only (a guard), recording the method with `as`.
        # TODO: this case lets every role delete: a bare name captures, it does not compare. Use a dotted value pattern.
        case Request("DELETE", ("users", int(user_id)), ADMIN):
            return ("delete_user", {"user_id": user_id})
        # TODO: any other PUT, PATCH or DELETE on ("users", id) -> ("forbidden", {"user_id": id}).
        case _:
            return ("not_found", {})
