from collections import ChainMap, Counter, deque


class RecentItems:
    def __init__(self, limit):
        self.limit = limit
        self._items = deque(maxlen=limit)

    def add(self, item):
        self._items.append(item)

    def items(self):
        return list(self._items)


class Inventory:
    def __init__(self):
        self._stock = Counter()

    def restock(self, sku, quantity):
        self._stock[sku] += quantity

    def remove(self, sku, quantity):
        if self._stock[sku] < quantity:
            raise ValueError(f"not enough stock for {sku}: {self._stock[sku]} available, {quantity} requested")
        self._stock[sku] -= quantity

    def available(self, sku):
        return self._stock[sku]

    def snapshot(self):
        return {sku: quantity for sku, quantity in self._stock.items() if quantity > 0}


def layered_config(cli, env, defaults):
    return ChainMap(cli, env, defaults)
