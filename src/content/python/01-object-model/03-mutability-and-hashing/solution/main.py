SCALARS = (int, float, bool, str, bytes, type(None))


def freeze(value):
    if isinstance(value, SCALARS):
        return value
    if isinstance(value, (list, tuple)):
        return tuple(freeze(item) for item in value)
    if isinstance(value, (set, frozenset)):
        return frozenset(freeze(item) for item in value)
    if isinstance(value, dict):
        return frozenset((key, freeze(item)) for key, item in value.items())
    raise TypeError(f"cannot freeze a value of type {type(value).__name__}")


def memoize_by_value(function):
    cache = {}

    def wrapper(*args, **kwargs):
        key = (freeze(args), freeze(kwargs))
        if key not in cache:
            wrapper.calls += 1
            cache[key] = function(*args, **kwargs)
        return cache[key]

    wrapper.calls = 0
    return wrapper
