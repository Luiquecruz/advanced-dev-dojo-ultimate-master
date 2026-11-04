from dataclasses import dataclass, field

from pydantic import BaseModel, ConfigDict


# TODO: make User a Pydantic model (BaseModel) that rejects unknown fields with model_config.
# A dataclass only stores what it receives: no coercion, no errors, extra keys crash with TypeError.
@dataclass
class User:
    id: int
    email: str
    tags: list[str] = field(default_factory=list)


# TODO: parse and validate with User.model_validate(data), so invalid data raises ValidationError.
def parse_user(data: dict) -> User:
    """Return a validated User built from a JSON-decoded dict."""
    return User(**data)


# TODO: return a new dict without the email (model_dump with exclude); vars() is the object's own __dict__.
def to_public(user: User) -> dict:
    """Return the fields other users may see."""
    public = vars(user)
    public.pop("email", None)
    return public
