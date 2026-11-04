from typing import Any, Self

from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator, model_validator
from pydantic_core import PydanticCustomError


class Signup(BaseModel):
    model_config = ConfigDict(extra="forbid")

    username: str = Field(pattern=r"^[a-z0-9_]{3,20}$")
    email: str
    age: int = Field(ge=13, le=130)
    password: str = Field(min_length=12)
    password_confirm: str

    @model_validator(mode="before")
    @classmethod
    def accept_legacy_email(cls, data: Any) -> Any:
        """Move the legacy e_mail key to email, without touching the caller's dict."""
        if isinstance(data, dict) and "e_mail" in data and "email" not in data:
            data = dict(data)
            data["email"] = data.pop("e_mail")
        return data

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        """Strip and lowercase the address, and require name@domain.tld."""
        value = value.strip().lower()
        name, at, domain = value.partition("@")
        if not name or not at or "." not in domain:
            raise ValueError("email must look like name@domain.tld")
        return value

    @model_validator(mode="after")
    def passwords_match(self) -> Self:
        """Compare the two passwords once every field is valid."""
        if self.password != self.password_confirm:
            raise PydanticCustomError(
                "password_mismatch",
                "password and password_confirm must match",
                {"fields": ("password", "password_confirm")},
            )
        return self


def signup_errors(data: Any) -> list[dict]:
    """Return the validation errors safe to send back to the client."""
    try:
        Signup.model_validate(data)
    except ValidationError as error:
        return error.errors(include_input=False, include_url=False, include_context=False)
    return []
