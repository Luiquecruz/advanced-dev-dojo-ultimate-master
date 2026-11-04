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

## Coming from TypeScript and JavaScript

In a `switch`, `case ADMIN:` evaluates the expression `ADMIN` and compares it with `===`. In a pattern, a bare name is a **capture**: it matches anything and binds it.

```ts
const ADMIN = "admin";
switch (role) {
  case ADMIN: return deleteUser(id);   // role === "admin"
  default:    return forbidden();
}
```

```py
ADMIN = "admin"

match request:
    case Request("DELETE", ("users", int(user_id)), ADMIN):   # binds ADMIN = request.role
        return ("delete_user", {"user_id": user_id})          # so every role can delete
```

Alone, `case ADMIN:` followed by more cases is rejected at compile time ("name capture 'ADMIN' makes remaining patterns unreachable"). Nested inside a sequence or class pattern it compiles and silently matches every role. To compare with a constant, use a **value pattern** (a dotted name such as `Role.ADMIN` or `config.ADMIN_ROLE`), a literal (`"admin"`) or a guard (`if role == ADMIN`).

The second habit is treating a failed check inside a block like `break` in a `switch`:

```py
match request:
    case Request("PATCH", ("users", int(user_id)), role):
        if role in (Role.EDITOR, Role.ADMIN):
            return ("update_user", {"user_id": user_id})
        # a guest falls off the end of this block, and the match statement is over
    case Request("PATCH", ("users", int(user_id))):
        return ("forbidden", {"user_id": user_id})    # never reached by a guest PATCH
```

Once a block runs, the `match` is over. Only a false **guard** sends control on to the next case.

## How it works

**Order.** Cases are tried from top to bottom, and the first one whose pattern matches and whose guard is true wins. Put specific cases before general ones. Python only rejects an unreachable case when it follows an irrefutable one, such as `case _:` or a bare capture without a guard.

**Guards** are evaluated in case order, only for cases whose pattern matched, after the pattern's names are bound. A guard can use those names, any other variable in scope and any expression; an exception raised in a guard propagates.

**Or-patterns** try their alternatives left to right and stop at the first match. Every alternative must bind the same names: `case ["move", x] | ["go", x]:` is valid, `case ["move", x] | ["stop"]:` is a `SyntaxError` ("alternative patterns bind different names"). Only the last alternative may be irrefutable.

**As-patterns** bind the value after the pattern on their left matched. `|` binds tighter than `as`, so `"PUT" | "PATCH" as method` captures whichever method matched.

**Value patterns** need a dot. The name is looked up when the case is tried and compared with `==`. Enum members are the usual choice, and a `StrEnum` member equals its string value, so `Role.ADMIN` also matches the plain string `"admin"`.

**Captures** bind each name once per pattern: `case [x, x]:` is a `SyntaxError`. Write `case [x, y] if x == y:` instead.

## When to choose it

- **Guards** for conditions a pattern cannot express: ranges (`if 200 <= status < 300`), permissions, comparisons between captured values.
- **Or-patterns** for alternatives that share one block, with **`as`** when the block needs to know which alternative matched.
- **Dotted value patterns** for every comparison with a named constant. A bare name in a pattern is always a capture.
- **A routing table** (a dict or a router library) when plugins or configuration add routes. A `match` suits a small, fixed set of routes owned by one module.
