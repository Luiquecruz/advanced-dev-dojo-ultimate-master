class Basket:
    def __init__(self, items=None):
        self.items = list(items or [])

    def __len__(self):
        return len(self.items)


class Quota:
    def __init__(self, limit, used):
        self.limit = limit
        self.used = used

    def __bool__(self):
        return self.used < self.limit


def coalesce(*values):
    for value in values:
        if value is not None:
            return value
    return None


def first_truthy(*values, default=None):
    for value in values:
        if value:
            return value
    return default
