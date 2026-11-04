from main import ConflictError, NotFoundError, exit_status, parse_age, respond

ORDERS = {7: "captured"}


class AlreadyCaptured(ConflictError):
    """A subclass added later: it inherits status 409."""


def capture(order_id: int):
    def action() -> str:
        if order_id not in ORDERS:
            raise NotFoundError(f"order {order_id} not found")
        if ORDERS[order_id] == "captured":
            raise AlreadyCaptured(f"order {order_id} is already captured")
        return "ok"

    return action


print(respond(capture(7)))
print(respond(capture(8)))
print(respond(lambda: parse_age("forty")))
print(respond(lambda: parse_age(" 41 ")))
print("status of a plain KeyError:", exit_status(KeyError("x")))

try:
    respond(lambda: ORDERS["seven"])
except KeyError as bug:
    print("bug reached the top-level handler:", repr(bug))
