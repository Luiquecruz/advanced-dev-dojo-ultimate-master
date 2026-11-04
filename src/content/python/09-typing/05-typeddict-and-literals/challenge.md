An API edge receives JSON objects that the rest of the code treats as `UserPayload` dicts. A TypedDict checks nothing at runtime, so write the validator that does, driven by the TypedDict's own metadata.

## `class UserPayload(TypedDict)`

| Key | Type | Required | Read-only |
| --- | --- | --- | --- |
| `id` | `int` | yes | yes (`ReadOnly`) |
| `name` | `str` | yes | no |
| `role` | `Literal["admin", "editor", "viewer"]` | yes | no |
| `tags` | `list[str]` | no (`NotRequired`) | no |

So `__required_keys__ == {"id", "name", "role"}`, `__optional_keys__ == {"tags"}` and `__readonly_keys__ == {"id"}`, and `get_type_hints(UserPayload)` maps the keys to the plain types above.

## `validate_payload(data, schema)`

`data` is a dict decoded from JSON and `schema` is **any** TypedDict class (the tests also pass their own, including one with `total=False` and `Required[...]`). Read the rules from `typing.get_type_hints(schema)` and `schema.__required_keys__`; never hard-code `UserPayload`. Return a list of error strings, empty when the payload is valid:

1. For each key of `get_type_hints(schema)`, in that order:
   - absent and required: `"<key>: missing"`; absent and optional: no error.
   - annotation `Literal[...]` and the value is not one of its arguments: `"<key>: not allowed"`.
   - any other annotation and the value does not fit it: `"<key>: wrong type"`.
2. Then, for each key of `data` (in its order) that the schema does not declare: `"<key>: unknown key"`.

Supported annotations: `str`; `int`, which **rejects `bool`** (JSON `true` is not a number); `list[T]` for a supported `T`, where every item must fit; and `Literal[...]` of strings. Any other annotation raises `TypeError`.
