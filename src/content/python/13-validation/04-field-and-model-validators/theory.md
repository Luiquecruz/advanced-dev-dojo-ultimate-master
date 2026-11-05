Types say *what* a field is; constraints and validators say *which values* are acceptable. Pydantic offers three layers, from declarative to custom:

```py
from typing import Self
from pydantic import BaseModel, Field, field_validator, model_validator

class Transfer(BaseModel):
    amount_cents: int = Field(gt=0, le=1_000_000)          # declarative constraints
    currency: str = Field(pattern=r"^[A-Z]{3}$")
    source: str
    target: str

    @field_validator("currency", mode="before")            # runs before the str check
    @classmethod
    def upper(cls, value: object) -> object:
        return value.upper() if isinstance(value, str) else value

    @model_validator(mode="after")                         # sees the whole, valid object
    def different_accounts(self) -> Self:
        if self.source == self.target:
            raise ValueError("source and target must differ")
        return self

print(Transfer(amount_cents=500, currency="eur", source="A", target="B").currency)   # EUR
```

## How it works

**Rules live in the model.** Building the object first and calling `check(signup)` somewhere in the handler leaves a window where code holds an unchecked `Signup`, and splits the errors between a `ValidationError` and whatever the check raises. Inside the model, no code can hold an invalid instance, and every problem lands in the same `ValidationError`.

**Order of execution.** `mode="before"` model validators receive the raw input, of *any* type: a dict, a list, a string. Then each field runs its before validators, the type and constraint checks, and its after validators (the default `mode`). `mode="after"` model validators run last, and **only when every field is valid**: a model rule never sees half-validated data.

**What a validator raises.** `ValueError` becomes an error of type `value_error`, located at the field (`loc == ("email",)`) or, for a model validator, at `()`. `assert` gives `assertion_error`, but asserts disappear under `python -O`, so do not use them for rules. `PydanticCustomError("password_mismatch", "message", {"fields": (...)})` sets your own stable `type` and a `ctx` dict that clients can read, which is the right tool when an error concerns several fields.

**`ValidationInfo`.** A field validator can take an `info` argument: `info.data` holds the fields validated *before* this one (declaration order matters, and a field that failed is absent), and `info.field_name` names the current field. Cross-field rules are usually clearer as an after model validator.

**Before validators must not mutate.** `data` may be the caller's own dict. Copy it before renaming keys, and return non-dict input untouched so the normal `model_type` error reports it instead of an `AttributeError`.

**Safe error reports.** `error.errors(include_input=False, include_url=False, include_context=False)` keeps `type`, `loc` and `msg`, and the result survives `json.dumps`. Never put the value into your own messages either: `f"{value!r} is not an email"` leaks it.

## Common mistakes

**Returning `error.errors()` to the client unchanged.** Each error dict carries the rejected value under `input`, and `str(error)` prints `input_value=...`, so a 422 response sends the password back to whoever made the request, and into every log that records responses:

```py
# wrong: every error dict includes "input", the rejected password among them
except ValidationError as error:
    return error.errors()

# right: keep type, loc and msg; drop the input, the URL and the context
except ValidationError as error:
    return error.errors(include_input=False, include_url=False, include_context=False)
```

`ConfigDict(hide_input_in_errors=True)` is not the fix: it hides the input in `str(error)` only.

## Legacy vs modern

v1 used `@validator("field", pre=True)` and `@root_validator(pre=True)` with `values` dicts. v2 replaced them with `@field_validator(..., mode=...)`, `@model_validator(mode="before" | "after" | "wrap")` and `ValidationInfo`. The v1 decorators still import, with deprecation warnings.

> **Status as of November 2026:** `field_validator`, `model_validator`, `ValidationInfo` and `PydanticCustomError` (exported by `pydantic_core`) are stable across Pydantic 2.x, from this sandbox's 2.12.5 to the latest 2.14.2 on PyPI; 2.13.1 and 2.13.2 fixed `ValidationInfo.data` and `field_name` being missing under `model_validate_json`. Sources: the Pydantic 2.12 docs "Validators" and "Validation Errors" at pydantic.dev/docs/validation, and the Pydantic changelog.

## When to choose it

- **`Field(...)` constraints** first: they appear in the JSON Schema and cost nothing to read.
- **Field validators** for normalization and single-field rules that a constraint cannot express (`strip().lower()`, a checksum).
- **After model validators** for rules across fields; **before model validators** only to adapt legacy input shapes, never to enforce business rules on raw data.
- A **custom error type** whenever a client or another service reacts to the error programmatically.
- Keep authorization out of validators: "is this user allowed to set `role`?" depends on who is calling, not on the payload.
