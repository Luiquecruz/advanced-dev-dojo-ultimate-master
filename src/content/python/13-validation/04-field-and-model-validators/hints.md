Start with the declarative part: `username: str = Field(pattern=...)`, `age: int = Field(ge=13, le=130)`, `password: str = Field(min_length=12)`. Field validators and model validators are methods decorated with `@field_validator("email")` / `@model_validator(...)`; the field and before-model ones are also `@classmethod`.
---
An after model validator is an instance method that returns `self`. It never runs when a field failed, which is why a short password does not also produce `password_mismatch`. Raise `PydanticCustomError(type, message, context)` to choose the error `type` and attach `{"fields": (...)}` as `ctx`.
---
The before model validator gets whatever the caller passed. Guard with `isinstance(data, dict)`, copy with `dict(data)` before `pop`, and return the copy. For `signup_errors`, look at the keyword arguments of `error.errors()`: `include_input`, `include_url`, `include_context`.
