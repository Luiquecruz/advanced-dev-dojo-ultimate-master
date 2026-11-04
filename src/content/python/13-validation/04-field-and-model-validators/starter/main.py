from typing import Any, Self

from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator, model_validator
from pydantic_core import PydanticCustomError


class Signup(BaseModel):
    model_config = ConfigDict(extra="forbid")

    # TODO: constrain the fields with Field(...): username matches ^[a-z0-9_]{3,20}$, age is 13 to 130,
    # password has at least 12 characters.
    username: str
    email: str
    age: int
    password: str
    password_confirm: str

    # TODO: a model_validator(mode="before") that moves a legacy "e_mail" key to "email" when "email" is absent.
    # It receives the raw input (any type) and must not modify the caller's dict.

    # TODO: a field_validator("email") that strips and lowercases the address and raises ValueError
    # unless it looks like name@domain.tld (the message must not quote the value).

    # TODO: a model_validator(mode="after") that raises PydanticCustomError("password_mismatch", ...)
    # with {"fields": ("password", "password_confirm")} as context when the passwords differ.


def signup_errors(data: Any) -> list[dict]:
    """Return the validation errors safe to send back to the client."""
    try:
        Signup.model_validate(data)
    except ValidationError as error:
        # TODO: drop the rejected input (it may be a password), the URL and the context.
        return error.errors()
    return []
