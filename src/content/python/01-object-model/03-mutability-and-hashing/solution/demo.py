from main import cache_key, freeze

config = {"regions": ["eu", "us"], "limits": {"max": 3}}
frozen = freeze(config)
print("hashable:", isinstance(hash(frozen), int))
print("as dict key:", {frozen: "cached"}[freeze({"limits": {"max": 3}, "regions": ["eu", "us"]})])

results = {}
results[cache_key(([1, 2, 3],), {"scale": 2})] = 12
print("same call found:", cache_key(([1, 2, 3],), {"scale": 2}) in results)
print("other call found:", cache_key(([1, 2, 4],), {"scale": 2}) in results)
