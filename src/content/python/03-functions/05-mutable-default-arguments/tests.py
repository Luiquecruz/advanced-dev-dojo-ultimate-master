# beginner mistake: tags=[] in the signature creates one list when def runs, and every call appends to it
@test("add_tag calls without a list never share one")
def _():
    first = mod.add_tag("python")
    second = mod.add_tag("rust")
    assert first == ["python"]
    assert second == ["rust"]
    existing = ["a"]
    returned = mod.add_tag("b", existing)
    assert returned is existing
    assert existing == ["a", "b"]
    empty = []
    filled = mod.add_tag("c", empty)
    assert filled is empty


@test("Registry instances start with independent items and copy a dict passed in")
def _():
    first = mod.Registry()
    second = mod.Registry()
    first.register("cache", 1)
    assert second.items == {}
    seed = {"db": 2}
    seeded = mod.Registry(seed)
    seeded.register("queue", 3)
    assert seed == {"db": 2}
    assert seeded.items == {"db": 2, "queue": 3}


@test("request tells an omitted headers argument apart from None")
def _():
    omitted = mod.request("/orders")
    explicit_none = mod.request("/orders", None)
    custom = mod.request("/orders", {"X-Trace": "1"})
    assert omitted["headers"] == mod.DEFAULT_HEADERS
    assert explicit_none["headers"] == {}
    assert custom["headers"] == {"X-Trace": "1"}
    assert omitted["path"] == "/orders"


@test("request never hands out the module default headers object")
def _():
    response = mod.request("/orders")
    response["headers"]["Authorization"] = "secret"
    later = mod.request("/users")
    assert "Authorization" not in mod.DEFAULT_HEADERS
    assert "Authorization" not in later["headers"]
