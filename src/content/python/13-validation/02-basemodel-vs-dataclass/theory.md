A **dataclass stores** what it receives. A Pydantic **`BaseModel` parses**: it converts the input to the declared types, checks every field, and either returns a fully valid object or raises one `ValidationError` that lists every problem.

```py
from dataclasses import dataclass
from pydantic import BaseModel, ValidationError

@dataclass
class UserRecord:
    id: int
    email: str

class User(BaseModel):
    id: int
    email: str

print(UserRecord(id="42", email=None))        # UserRecord(id='42', email=None): stored as given
print(User.model_validate({"id": "42", "email": "ada@example.com"}))   # id=42 email='ada@example.com'

try:
    User.model_validate({"id": "forty-two"})
except ValidationError as error:
    print([(e["loc"], e["type"]) for e in error.errors()])
    # [(('id',), 'int_parsing'), (('email',), 'missing')]
```

Both classes have the same annotations. Only the model reads them at runtime to build a validator.

## Coming from TypeScript and JavaScript

The habit that breaks is **trusting the annotation**, the Python version of a cast:

```ts
const user = JSON.parse(body) as User;           // compiles, checks nothing
const parsed = UserSchema.parse(JSON.parse(body)); // Zod: parse, don't validate
```

A dataclass is the `as User` line: `UserRecord(**payload)` type-checks in your editor and accepts `"42"`, `None` or a nested dict at runtime. `BaseModel` is the Zod line: the class is the schema *and* the type, so there is no `z.infer` step. Two differences from Zod matter:

- **Unknown keys.** `z.object()` strips unknown keys; a Pydantic model ignores them by default too. Neither fails, so a client can send `"is_admin": true` and you never hear about it. `z.strictObject()` rejects them; in Pydantic it is `model_config = ConfigDict(extra="forbid")`, which reports each one as `extra_forbidden`.
- **Coercion.** Zod rejects `"42"` for `z.number()` unless you write `z.coerce.number()`. Pydantic's default **lax mode** converts it. The next lesson is about when that is right.

## How it works

- `User.model_validate(data)` validates a dict (or any object, with `from_attributes=True`); `User(id=..., email=...)` validates keyword arguments the same way. `User.model_validate_json(text)` parses and validates JSON in one pass.
- **Errors are data.** `error.errors()` returns one dict per problem: `type` (a stable code such as `int_parsing`, `missing`, `extra_forbidden`), `loc` (a tuple path such as `("tags", 1)`), `msg` (human text that can change between versions) and `input` (the rejected value). Code that reacts to errors reads `type` and `loc`, never `msg`. `error.error_count()` gives the total: validation does not stop at the first failure.
- **Defaults are copied.** `tags: list[str] = []` is safe on a model: Pydantic copies a mutable default for every instance. On a dataclass the same line raises `ValueError: mutable default ... use default_factory`, and in a plain function signature it is the shared-default bug of module 03.
- **Dumping.** `model_dump()` returns a new dict; `include=`/`exclude=` choose fields. It never exposes the model's own `__dict__`, so editing the result leaves the model intact.
- **`model_construct()` skips validation.** It exists to rebuild models from data you validated earlier. Called on request data, it gives you an object that *looks* validated and holds `id="42"`, a missing field or an extra `is_admin`: never use it on untrusted input.

Pitfall: a validated model is not frozen. `user.id = "x"` is accepted unless the config sets `validate_assignment=True` or `frozen=True`.

## Legacy vs modern

Pydantic v1 spelled these `User.parse_obj(data)`, `user.dict()`, `user.json()` and an inner `class Config:`. v2 renamed them to `model_validate`, `model_dump`, `model_dump_json` and `model_config = ConfigDict(...)`; the old names still work with deprecation warnings.

> **Status as of November 2026:** The latest release on PyPI is Pydantic 2.14.2 (29 October 2026, Python 3.10 or newer). This sandbox runs Pydantic 2.12.5 with pydantic-core 2.41.5, the versions shipped by Pyodide 314.0.7. The v1 API lives on as the `pydantic.v1` namespace inside v2, and the separate 1.10 line still gets occasional patch releases (1.10.27, October 2026). The documentation moved from docs.pydantic.dev, which now redirects, to pydantic.dev/docs/validation. Sources: pypi.org/project/pydantic and the Pydantic changelog.

## When to choose it

- **`BaseModel`** at a trust boundary: request bodies, webhook payloads, config files, messages from another team. Add `extra="forbid"` when unknown keys signal a client bug or an attack.
- **A dataclass** for objects your own code builds from values that are already correct: domain objects, results, internal messages. It is lighter and has no third-party dependency.
- **`TypedDict`** when the data must stay a plain dict (module 09); validate it with `TypeAdapter` if it comes from outside.
- Never `model_construct()` on input you did not validate yourself.
