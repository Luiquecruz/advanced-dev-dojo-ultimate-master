from main import make_handlers, make_multipliers, once

handlers = make_handlers(["ada", "linus", "grace"])
print("handlers:", [handler() for handler in handlers])

double, triple = make_multipliers([2, 3])
print("multipliers:", double(21), triple(14))

connections = []


def connect(host):
    connections.append(host)
    return f"connected to {host}"


connect_once = once(connect)
print(connect_once("db1"))
print(connect_once("db2"), "| real connections:", connections)
