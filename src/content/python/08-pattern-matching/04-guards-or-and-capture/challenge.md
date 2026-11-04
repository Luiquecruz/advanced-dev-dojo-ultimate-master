Finish the request router in `main.py`. `Role` (a `StrEnum` with `GUEST`, `EDITOR` and `ADMIN`) and the frozen dataclass `Request(method, path, role=Role.GUEST)` are already written; `path` is a tuple of segments where ids are already `int`s, for example `("users", 42)`.

## `route(request)`

Return a tuple `(handler_name, arguments)`. The first matching row wins:

| Method | Path | Role | Result |
| --- | --- | --- | --- |
| `GET` or `HEAD` | `("users",)` | any | `("list_users", {})` |
| `GET` or `HEAD` | `("v1", "users")` or `("v2", "users")` | any | `("list_users", {"version": "v1"})` (the prefix that matched) |
| `GET` or `HEAD` | `("users", <int id>)` | any | `("show_user", {"user_id": id})` |
| `PUT` or `PATCH` | `("users", <int id>)` | editor or admin | `("update_user", {"user_id": id, "method": "PATCH"})` (the method that matched) |
| `DELETE` | `("users", <int id>)` | admin | `("delete_user", {"user_id": id})` |
| `PUT`, `PATCH` or `DELETE` | `("users", <int id>)` | any other value | `("forbidden", {"user_id": id})` |
| anything else | | | `("not_found", {})` |

An id that is not an `int` (`("users", "42")`), extra segments, an unknown prefix such as `"v3"`, a path given as a plain string, and any other method are all `not_found`.

## Required constructs

`route` must use a `match` statement with at least one guard (`case ... if ...:`), one or-pattern (`|`), one as-pattern (`pattern as name`) and one dotted value pattern such as `Role.ADMIN`.

The starter's delete case compares the role with the module constant `ADMIN` written as a bare name. That is a capture pattern: it binds any role, so guests can delete users. Fix it with a value pattern.
