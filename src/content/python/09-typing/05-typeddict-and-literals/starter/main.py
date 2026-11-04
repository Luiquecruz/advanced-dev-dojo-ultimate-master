from typing import Literal, TypedDict


# TODO: make id read-only and tags optional, so the key sets match the contract.
class UserPayload(TypedDict):
    id: int
    name: str
    role: Literal["admin", "editor", "viewer"]
    tags: list[str]


# TODO: validate data against the TypedDict class `schema` with get_type_hints and __required_keys__.
# Calling a TypedDict class only builds a plain dict: it checks nothing.
def validate_payload(data: dict[str, object], schema: type) -> list[str]:
    """Check data against a TypedDict class and return the error messages."""
    schema(**data)
    return []
