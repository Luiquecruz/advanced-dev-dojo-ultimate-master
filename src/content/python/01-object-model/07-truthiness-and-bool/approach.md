1. Separate the two questions: "is there something?" (truthiness) and "was a value given?" (`is None`).
2. `Basket`: store the items and implement `__len__`, letting Python derive the truth value.
3. `Quota`: implement `__bool__` from the remaining capacity and make sure no `__len__` exists.
4. `coalesce`: loop and return the first value that `is not None`; fall through to `None`.
5. `first_truthy`: loop with `if value:` and fall through to `default`.
6. Check `0`, `""` and `[]` against both helpers to see why they must behave differently.
