def freeze(value):
    # TODO: return a hashable, immutable equivalent of `value`.
    # Scalars unchanged; list/tuple -> tuple; set/frozenset -> frozenset;
    # dict -> frozenset of (key, frozen value); anything else -> TypeError naming the type.
    return value


def memoize_by_value(function):
    cache = {}

    def wrapper(*args, **kwargs):
        # TODO: build the key from freeze(args) and freeze(kwargs), count real calls in wrapper.calls.
        key = (args, tuple(kwargs.items()))
        if key not in cache:
            cache[key] = function(*args, **kwargs)
        return cache[key]

    wrapper.calls = 0
    return wrapper
