class RecentItems:
    def __init__(self, limit):
        self.limit = limit
        self._items = []

    def add(self, item):
        # TODO: keep only the last `limit` items (use a deque with maxlen).
        self._items.append(item)

    def items(self):
        return list(self._items)


class Inventory:
    def __init__(self):
        self._stock = {}

    def restock(self, sku, quantity):
        # TODO: use a Counter so unknown SKUs start at 0.
        self._stock[sku] += quantity

    def remove(self, sku, quantity):
        # TODO: raise ValueError (message with the SKU) when stock is insufficient and keep the stock unchanged.
        self._stock[sku] -= quantity

    def available(self, sku):
        return self._stock.get(sku, 0)

    def snapshot(self):
        # TODO: plain dict with only the SKUs above zero.
        return dict(self._stock)


def layered_config(cli, env, defaults):
    # TODO: a ChainMap that searches cli, env, defaults and writes to cli.
    return {**defaults, **env, **cli}
