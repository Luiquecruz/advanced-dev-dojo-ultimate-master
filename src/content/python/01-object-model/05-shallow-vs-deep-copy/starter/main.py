def clone_config(config, **overrides):
    # TODO: return a deep copy of `config` with `overrides` applied. Cycles must be preserved.
    clone = dict(config)
    clone.update(overrides)
    return clone


def with_defaults(config, defaults):
    # TODO: return a new dict that shares no mutable object with `defaults` or `config`.
    return {**defaults, **config}


def diff_shared(first, second):
    # TODO: sorted keys present in both dicts whose values are the same list, dict or set object.
    return []
