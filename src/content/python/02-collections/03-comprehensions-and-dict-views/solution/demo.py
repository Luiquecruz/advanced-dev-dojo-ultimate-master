from main import group_by, invert, live_keys, shared_keys

roles = {"u1": "admin", "u2": "admin", "u3": "guest"}
print("invert:", {role: sorted(users) for role, users in invert(roles).items()})
print("group_by:", group_by(["apple", "avocado", "banana"], lambda word: word[0]))

stock = {"pen": 3}
names = live_keys(stock)
stock["ink"] = 5
print("live view sees new key:", sorted(names))
print("shared:", sorted(shared_keys({"a": 1, "b": 2}, {"b": 3, "c": 4})))
