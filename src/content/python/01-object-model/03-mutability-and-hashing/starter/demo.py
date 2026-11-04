from main import freeze, memoize_by_value

config = {"regions": ["eu", "us"], "limits": {"max": 3}}
frozen = freeze(config)
print("hashable:", isinstance(hash(frozen), int))
print("as dict key:", {frozen: "cached"}[freeze({"limits": {"max": 3}, "regions": ["eu", "us"]})])


def total(items, scale=1):
    return sum(items) * scale


cached_total = memoize_by_value(total)
print(cached_total([1, 2, 3], scale=2), cached_total([1, 2, 3], scale=2))
print("real calls:", cached_total.calls)
