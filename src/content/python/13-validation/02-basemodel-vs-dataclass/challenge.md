# Parse users at the API edge

A sign-up endpoint receives JSON bodies that the rest of the service treats as `User` objects. Today `User` is a dataclass, so `"42"` stays a string, a missing email becomes a `TypeError` deep inside the handler, and an extra `"is_admin": true` passes unnoticed. Turn it into a Pydantic model and parse at the edge.

Implement in `main.py`:

## `class User(BaseModel)`

| Field | Type | Default |
| --- | --- | --- |
| `id` | `int` | required |
| `email` | `str` | required |
| `tags` | `list[str]` | `[]` (each instance gets its own list) |

Unknown fields are an error: set `model_config = ConfigDict(extra="forbid")`.

## `parse_user(data)`

`data` is a dict decoded from JSON. Return a validated `User`. Lax mode is fine here: `"42"` becomes `42`. Invalid data raises `pydantic.ValidationError` listing **every** problem, with the standard error types: `int_parsing` for a non-numeric id, `missing` for an absent field, `string_type` for a non-string tag (located at `("tags", <index>)`) and `extra_forbidden` for an unknown key. Never build the user with `model_construct`, which skips validation.

## `to_public(user)`

Return a new plain `dict` with every field except `email`, for responses other users can see. The `user` passed in must keep its email.

The tests check error `type` and `loc`, never the message text.
