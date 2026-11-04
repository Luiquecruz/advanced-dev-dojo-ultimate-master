import inspect

from main import AuthExpired, build_client


class SimulatedClock:
    def __init__(self):
        self.now = 0.0

    def __call__(self):
        return self.now


class Tokens:
    def __init__(self):
        self.token = "expired-token"

    def current(self):
        return self.token

    def refresh(self):
        self.token = "fresh-token"
        return self.token


clock = SimulatedClock()
attempts = []


def get_orders(customer, *, token):
    """Load the orders of one customer."""
    attempts.append(token)
    clock.now += 0.25
    if token == "expired-token":
        raise AuthExpired("token expired")
    if len(attempts) < 3:
        raise ConnectionError("gateway timeout")
    return [f"{customer}-order-1", f"{customer}-order-2"]


store, metrics = {}, []
client = build_client(get_orders, store=store, metrics=metrics, tokens=Tokens(), clock=clock)

print("first call:", client("ada"), "| inner attempts:", attempts)
print("second call (cached):", client("ada"), "| inner attempts:", len(attempts))
print("metrics:", metrics)
print("name:", client.__name__, "| unwraps to original:", inspect.unwrap(client) is get_orders)
