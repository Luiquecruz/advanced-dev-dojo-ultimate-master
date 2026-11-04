from pydantic import BaseModel, ConfigDict


class User(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: int
    email: str
    tags: list[str] = []


def parse_user(data: dict) -> User:
    """Return a validated User built from a JSON-decoded dict."""
    return User.model_validate(data)


def to_public(user: User) -> dict:
    """Return the fields other users may see."""
    return user.model_dump(exclude={"email"})
