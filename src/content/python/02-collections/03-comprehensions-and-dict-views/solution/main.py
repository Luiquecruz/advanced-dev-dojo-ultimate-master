from collections import defaultdict


def invert(mapping):
    inverted = defaultdict(set)
    for key, value in mapping.items():
        inverted[value].add(key)
    return dict(inverted)


def group_by(items, key):
    groups = defaultdict(list)
    for item in items:
        groups[key(item)].append(item)
    return dict(groups)


def shared_keys(first, second):
    return first.keys() & second.keys()


def live_keys(mapping):
    return mapping.keys()
