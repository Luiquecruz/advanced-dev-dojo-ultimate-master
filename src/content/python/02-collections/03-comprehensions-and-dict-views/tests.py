# beginner mistake: inverting with a dict comprehension, so a repeated value keeps only the last key
@test("invert collects every key of a repeated value into a set")
def _():
    roles = {"u1": "admin", "u2": "admin", "u3": "guest"}
    inverted = mod.invert(roles)
    assert inverted == {"admin": {"u1", "u2"}, "guest": {"u3"}}
    assert roles == {"u1": "admin", "u2": "admin", "u3": "guest"}


@test("group_by groups by the key function and keeps the item order")
def _():
    groups = mod.group_by(["apple", "avocado", "banana", "blueberry", "cherry"], lambda word: word[0])
    assert groups == {"a": ["apple", "avocado"], "b": ["banana", "blueberry"], "c": ["cherry"]}
    by_length = mod.group_by((word for word in ["aa", "b", "cc"]), len)
    assert by_length == {2: ["aa", "cc"], 1: ["b"]}


@test("shared_keys returns a set of the common keys")
def _():
    result = mod.shared_keys({"a": 1, "b": 2}, {"b": 9, "c": 3})
    assert result == {"b"}
    assert isinstance(result, set)


@test("live_keys returns the dict's own keys view, which follows later changes")
def _():
    stock = {"pen": 3}
    view = mod.live_keys(stock)
    stock["ink"] = 5
    assert "ink" in view
    assert len(view) == 2
    assert type(view).__name__ == "dict_keys"
