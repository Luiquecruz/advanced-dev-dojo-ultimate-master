def invert(mapping):
    inverted = {}
    for key, value in mapping.items():
        inverted.setdefault(value, set()).add(key)
    return inverted


def group_by(items, key):
    groups = {}
    for item in items:
        groups.setdefault(key(item), []).append(item)
    return groups


def shared_keys(first, second):
    return first.keys() & second.keys()


def live_keys(mapping):
    return mapping.keys()
