Patterns describe shapes. Three more tools refine them: **or-patterns** (`p1 | p2`) try alternatives, **as-patterns** (`pattern as name`) bind the value an inner pattern matched, and **guards** (`case pattern if condition:`) add a condition that runs after the pattern matched.

```py
from enum import StrEnum

class Role(StrEnum):
    GUEST = "guest"
    ADMIN = "admin"

def route(method, path, role):
    match (method, path):
        case ("GET" | "HEAD", ["users"]):
            return "list_users"
        case ("GET" | "HEAD", ["v1" | "v2" as version, "users"]):
            return f"list_users {version}"
        case ("DELETE", ["users", int(user_id)]) if role == Role.ADMIN:
            return f"delete_user {user_id}"
        case ("DELETE", ["users", int()]):
            return "forbidden"
        case _:
            return "not_found"

route("DELETE", ["users", 7], Role.GUEST)   # 'forbidden': the guard was false, the next case matched
```

## How it works

**Order.** Cases are tried from top to bottom, and the first one whose pattern matches and whose guard is true wins. Put specific cases before general ones. Python only rejects an unreachable case when it follows an irrefutable one, such as `case _:` or a bare capture without a guard. Once a block runs, the `match` is over: an `if` inside the block that fails does not send control to the next case. Only a false **guard** does.

**Guards** are evaluated in case order, only for cases whose pattern matched, after the pattern's names are bound. A guard can use those names, any other variable in scope and any expression; an exception raised in a guard propagates. The names stay bound even when the guard is false, so a later case or the code after the `match` can see stale values. Since several guards may run for one subject, keep them free of side effects.

**Or-patterns** try their alternatives left to right and stop at the first match. Every alternative must bind the same names: `case ["move", x] | ["go", x]:` is valid, `case ["move", x] | ["stop"]:` is a `SyntaxError` ("alternative patterns bind different names"). Only the last alternative may be irrefutable.

**As-patterns** bind the value after the pattern on their left matched. `|` binds tighter than `as`, so `"PUT" | "PATCH" as method` captures whichever method matched.

**Value patterns** need a dot. A bare name such as `ADMIN` is always a capture, even when a module constant of that name exists; a dotted name such as `Role.ADMIN` or `config.ADMIN_ROLE` is looked up when the case is tried and compared with `==`. Enum members are the usual choice, and a `StrEnum` member equals its string value, so `Role.ADMIN` also matches the plain string `"admin"`.

**Captures** bind each name once per pattern: `case [x, x]:` is a `SyntaxError`. Write `case [x, y] if x == y:` instead.

## Common mistakes

**Comparing with a constant written as a bare name.** Inside a pattern, `ADMIN` does not read the module constant: it captures whatever is in that position. Alone, `case ADMIN:` followed by more cases is a `SyntaxError`; nested in a class or sequence pattern it compiles and matches every role:

```py
ADMIN = "admin"

# wrong: binds ADMIN = request.role, so every role can delete
match request:
    case Request("DELETE", ("users", int(user_id)), ADMIN):
        return ("delete_user", {"user_id": user_id})

# right: a dotted value pattern compares with ==
match request:
    case Request("DELETE", ("users", int(user_id)), Role.ADMIN):
        return ("delete_user", {"user_id": user_id})
```

A literal (`"admin"`) or a guard (`if role == ADMIN`) works too.

**Checking permissions with an `if` inside the block.** When the check fails, the block simply ends and the later `forbidden` case is never tried. Put the condition in a guard.

## When to choose it

- **Guards** for conditions a pattern cannot express: ranges (`if 200 <= status < 300`), permissions, comparisons between captured values.
- **Or-patterns** for alternatives that share one block, with **`as`** when the block needs to know which alternative matched.
- **Dotted value patterns** for every comparison with a named constant. A bare name in a pattern is always a capture.
- **A routing table** (a dict or a router library) when plugins or configuration add routes. A `match` suits a small, fixed set of routes owned by one module.
