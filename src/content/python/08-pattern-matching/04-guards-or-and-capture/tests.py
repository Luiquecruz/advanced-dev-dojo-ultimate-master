import ast


def misrouted(table):
    """Routes every (method, path, role) of the table and returns the requests whose result differs."""
    wrong = {}
    for (method, path, role), expected in table.items():
        request = mod.Request(method, path) if role is None else mod.Request(method, path, role)
        got = mod.route(request)
        if got != expected:
            wrong[f"{method} {path!r} {role}"] = {"got": got, "expected": expected}
    return wrong


def match_constructs(function_name):
    tree = ast.parse(source)
    functions = [node for node in ast.walk(tree) if isinstance(node, ast.FunctionDef) and node.name == function_name]
    cases = [case for function in functions for node in ast.walk(function) if isinstance(node, ast.Match) for case in node.cases]
    patterns = [node for case in cases for node in ast.walk(case.pattern)]
    found = set()
    if any(case.guard is not None for case in cases):
        found.add("guard")
    if any(isinstance(node, ast.MatchOr) for node in patterns):
        found.add("or-pattern")
    if any(isinstance(node, ast.MatchAs) and node.pattern is not None for node in patterns):
        found.add("as-pattern")
    if any(isinstance(node, ast.MatchValue) and isinstance(node.value, ast.Attribute) for node in patterns):
        found.add("dotted value pattern")
    return found


@test("GET and HEAD reach the list and show handlers, with an int user id")
def _():
    wrong = misrouted({
        ("GET", ("users",), None): ("list_users", {}),
        ("HEAD", ("users",), None): ("list_users", {}),
        ("GET", ("users", 42), None): ("show_user", {"user_id": 42}),
        ("HEAD", ("users", 7), mod.Role.ADMIN): ("show_user", {"user_id": 7}),
    })
    assert wrong == {}


@test("a v1 or v2 prefix is captured as the version")
def _():
    wrong = misrouted({
        ("GET", ("v1", "users"), None): ("list_users", {"version": "v1"}),
        ("HEAD", ("v2", "users"), None): ("list_users", {"version": "v2"}),
        ("GET", ("v3", "users"), None): ("not_found", {}),
    })
    assert wrong == {}


@test("PUT and PATCH update a user for editors and admins and record the method")
def _():
    wrong = misrouted({
        ("PUT", ("users", 5), mod.Role.EDITOR): ("update_user", {"user_id": 5, "method": "PUT"}),
        ("PATCH", ("users", 5), mod.Role.ADMIN): ("update_user", {"user_id": 5, "method": "PATCH"}),
        ("DELETE", ("users", 5), mod.Role.ADMIN): ("delete_user", {"user_id": 5}),
    })
    assert wrong == {}


# beginner mistake: a bare name such as ADMIN in a pattern, which captures every role instead of comparing
@test("writes from roles without permission are forbidden, whatever the role value")
def _():
    wrong = misrouted({
        ("PATCH", ("users", 9), mod.Role.GUEST): ("forbidden", {"user_id": 9}),
        ("DELETE", ("users", 9), mod.Role.GUEST): ("forbidden", {"user_id": 9}),
        ("DELETE", ("users", 9), mod.Role.EDITOR): ("forbidden", {"user_id": 9}),
        ("DELETE", ("users", 9), "intruder"): ("forbidden", {"user_id": 9}),
        ("PUT", ("users", 9), "superuser"): ("forbidden", {"user_id": 9}),
    })
    assert wrong == {}


@test("requests outside the route table are not found")
def _():
    wrong = misrouted({
        ("POST", ("users",), mod.Role.ADMIN): ("not_found", {}),
        ("GET", ("users", "42"), None): ("not_found", {}),
        ("DELETE", ("users",), mod.Role.ADMIN): ("not_found", {}),
        ("PATCH", ("users", 1, "avatar"), mod.Role.ADMIN): ("not_found", {}),
        ("GET", "users", None): ("not_found", {}),
        ("GET", (), None): ("not_found", {}),
    })
    assert wrong == {}


@test("route uses a guard, an or-pattern, an as-pattern and a dotted value pattern")
def _():
    found = match_constructs("route")
    expected = {"guard", "or-pattern", "as-pattern", "dotted value pattern"}
    missing = sorted(expected - found)
    assert missing == []
