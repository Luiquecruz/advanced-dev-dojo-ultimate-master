A bare name inside a pattern never compares: the starter's `ADMIN` binds whatever role arrives. Write `Role.ADMIN` instead; a dotted name is a value pattern compared with `==`.
---
Alternatives share one case with `|`, and `as` keeps the one that matched: `Request("GET" | "HEAD", ("v1" | "v2" as version, "users"))` and `Request("PUT" | "PATCH" as method, ("users", int(user_id)), role)`. `int(user_id)` both checks the type and binds the id.
---
Put the permission check in a guard, `... if role in (Role.EDITOR, Role.ADMIN):`, not in an `if` inside the block. When the guard is false, matching continues, so a later `case Request("PUT" | "PATCH" | "DELETE", ("users", int(user_id))):` can answer `forbidden` before the final `case _:`.
