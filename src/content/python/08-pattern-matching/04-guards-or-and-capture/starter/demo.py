from main import Request, Role, route

requests = [
    Request("GET", ("users",)),
    Request("HEAD", ("v2", "users")),
    Request("GET", ("users", 42)),
    Request("PATCH", ("users", 42), Role.EDITOR),
    Request("DELETE", ("users", 42), Role.EDITOR),
    Request("DELETE", ("users", 42), Role.ADMIN),
    Request("GET", ("users", "42")),
]
for request in requests:
    handler, arguments = route(request)
    print(f"{request.method:6} {request.path!r:16} as {request.role:6} -> {handler} {arguments}")
