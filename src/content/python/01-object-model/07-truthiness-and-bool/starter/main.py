class Basket:
    def __init__(self, items=None):
        self.items = [] if items is None else list(items)

    # TODO: make an empty basket falsy by implementing the sized-collection protocol.


class Quota:
    def __init__(self, limit, used):
        self.limit = limit
        self.used = used

    # TODO: replace __len__ with __bool__: truthy while capacity remains (used < limit).
    def __len__(self):
        return self.limit - self.used


def coalesce(*values):
    # TODO: return the first value that is not None, keeping 0, "" and [].
    for value in values:
        if value:
            return value
    return None


def first_truthy(*values, default=None):
    # TODO: return the first truthy value, or `default`.
    for value in values:
        if value is not None:
            return value
    return default
