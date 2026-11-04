def invert(mapping):
    # TODO: map each value to the SET of keys that had it. Duplicate values must not overwrite.
    return {value: key for key, value in mapping.items()}


def group_by(items, key):
    # TODO: map key(item) to the list of items, keeping their order.
    return {key(item): [item] for item in items}


def shared_keys(first, second):
    # TODO: the keys present in both dicts, as a set, using the keys views.
    return [name for name in first if name in second]


def live_keys(mapping):
    # TODO: return the live keys view of `mapping`, not a copy.
    return list(mapping.keys())
