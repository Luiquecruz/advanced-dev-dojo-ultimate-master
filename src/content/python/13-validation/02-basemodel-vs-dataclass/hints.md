Replace the dataclass with `class User(BaseModel)` and keep the same annotations: the model reads them at runtime. `tags: list[str] = []` is safe on a model because Pydantic copies mutable defaults for each instance. Unknown keys need a config line: `model_config = ConfigDict(extra="forbid")`.
---
`User.model_validate(data)` is the parse step: it coerces, checks every field and raises one `ValidationError` with all the problems. Print `[(e["loc"], e["type"]) for e in error.errors()]` to see what the tests compare. `model_construct` skips all of that.
---
`vars(user)` is the model's own `__dict__`, so popping from it removes the email from the user, and even a filtered copy shares the same `tags` list. `user.model_dump(exclude={"email"})` builds new containers.
