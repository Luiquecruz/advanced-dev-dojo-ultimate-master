# A sign-up model that enforces its own rules

The sign-up form posts JSON. Older mobile apps still send the address as `e_mail`. Today the handler builds the object first and checks the rules afterwards, and on failure it returns `error.errors()` to the client, passwords included. Move every rule into the model and make the error report safe.

Implement in `main.py`:

## `class Signup(BaseModel)` with `extra="forbid"`

| Field | Rule | Error type when broken |
| --- | --- | --- |
| `username: str` | `Field(pattern=r"^[a-z0-9_]{3,20}$")` | `string_pattern_mismatch` |
| `email: str` | a `field_validator` strips and lowercases it, then raises `ValueError` unless it looks like `name@domain.tld` (a non-empty name, an `@`, a dot in the domain) | `value_error` |
| `age: int` | `Field(ge=13, le=130)` | `greater_than_equal` / `less_than_equal` |
| `password: str` | `Field(min_length=12)` | `string_too_short` |
| `password_confirm: str` | must equal `password` (below) | `password_mismatch` |

- **Password check**: a `model_validator(mode="after")`, so it runs only when every field is valid. When the passwords differ, raise `PydanticCustomError("password_mismatch", <message>, {"fields": ("password", "password_confirm")})` from `pydantic_core`. The error is located at `()`, and its `ctx["fields"]` names both fields.
- **Legacy key**: a `model_validator(mode="before")` that, when the input is a dict with `e_mail` and without `email`, moves the value to `email`. Never modify the caller's dict, never overwrite an `email` that is present (then `e_mail` is just an unknown field), and pass non-dict input through untouched so Pydantic reports `model_type`.

## `signup_errors(data)`

Validate `data` and return `[]` when it is valid. Otherwise return the errors as a list of dicts that a handler can send back: each has `loc`, `type` and `msg`; none has `input`, and the list must survive `json.dumps` (drop `url` and `ctx`, since `ctx` may hold exception objects). No message may quote the rejected value, including your own `ValueError` text.

The tests read `type`, `loc` and `ctx`, never the message text.
