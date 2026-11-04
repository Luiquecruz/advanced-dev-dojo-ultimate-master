import copy

CONTAINERS = (list, dict, set)


def clone_config(config, **overrides):
    clone = copy.deepcopy(config)
    clone.update(overrides)
    return clone


def with_defaults(config, defaults):
    merged = copy.deepcopy(defaults)
    merged.update(copy.deepcopy(config))
    return merged


def diff_shared(first, second):
    shared = [key for key in first.keys() & second.keys() if first[key] is second[key] and isinstance(first[key], CONTAINERS)]
    return sorted(shared)
