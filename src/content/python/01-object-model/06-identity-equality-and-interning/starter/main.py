MISSING = None


def lookup(mapping, key, default=MISSING):
    # TODO: use a unique sentinel for MISSING; absent key without a default raises KeyError(key);
    # an explicit default (including None) is returned for absent keys.
    value = mapping.get(key)
    if value == None:
        return default
    return value


class Money:
    def __init__(self, amount, currency):
        self.amount = amount
        self.currency = currency

    # TODO: equal when amount and currency match; return NotImplemented for other types.
    def __eq__(self, other):
        return self.amount == other.amount

    # TODO: add a __hash__ consistent with __eq__.


def same_amount(first, second):
    # TODO: compare the amounts by value.
    return first.amount is second.amount
