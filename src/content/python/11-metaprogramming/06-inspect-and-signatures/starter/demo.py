import asyncio

from main import call_with, is_async, public_api


class OrderStore:
    def __init__(self):
        self.orders = {"ada": [120, 80], "grace": [35]}

    @classmethod
    def empty(cls):
        store = cls()
        store.orders = {}
        return store

    @staticmethod
    def currency():
        return "EUR"

    def for_user(self, user):
        return self.orders.get(user, [])

    async def refresh(self):
        await asyncio.sleep(0)
        return len(self.orders)


services = {"store": OrderStore(), "user": "ada", "clock": "2026-11-04T10:00Z"}


def order_total(store, user, *, currency="EUR"):
    return f"{sum(store.for_user(user))} {currency}"


async def refresh_report(store, clock):
    count = await store.refresh()
    return f"{count} customers refreshed at {clock}"


def needs_mailer(mailer, user):
    return f"mail {user}"


async def main():
    print("public API:", public_api(OrderStore))
    for handler in (order_total, refresh_report):
        result = call_with(handler, services)
        if is_async(handler):
            result = await result
        print(f"{handler.__name__} (async={is_async(handler)}):", result)
    try:
        call_with(needs_mailer, services)
    except TypeError as error:
        print("rejected:", error)


asyncio.run(main())
