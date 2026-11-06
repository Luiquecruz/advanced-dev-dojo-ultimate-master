def freeze(value):
    # TODO: return a hashable, immutable equivalent of `value`.
    # Scalars unchanged; list/tuple -> tuple; set/frozenset -> frozenset;
    # dict -> frozenset of (key, frozen value); anything else -> TypeError naming the type.
    return value


def cache_key(args, kwargs):
    # TODO: build the key from freeze(args) and freeze(kwargs).
    return (args, tuple(kwargs.items()))
