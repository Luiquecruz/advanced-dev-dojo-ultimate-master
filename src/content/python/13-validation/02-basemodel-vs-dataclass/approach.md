1. Read the tests as a contract: one checks coercion, two check error `type`/`loc` pairs, one checks defaults and one checks that the public dict is independent of the user.
2. Run the starter demo first. The dataclass keeps `"42"` as a string and crashes with `TypeError` on an extra key: annotations alone do nothing at runtime.
3. Turn `User` into a `BaseModel` with the same fields, and add `extra="forbid"` so an unexpected `is_admin` becomes an `extra_forbidden` error instead of disappearing (the default ignores it, like Zod's `z.object`).
4. Make `parse_user` call `User.model_validate(data)`. Check that one bad payload yields one exception with every error, not just the first, and that `model_construct` would let all of it through.
5. Write `to_public` with `model_dump(exclude=...)`, then mutate the result in a quick experiment to confirm the user is unchanged.
6. Run the demo again: one user accepted with its public view, two payloads rejected with located, typed errors.
