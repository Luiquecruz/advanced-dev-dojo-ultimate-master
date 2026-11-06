def sequence(*values):
    remaining = list(values)

    def random():
        assert remaining, "random() was called more often than this test scripted: pick() calls it exactly twice when there are two or more backends"
        return remaining.pop(0)

    return random


@test("route sends a path to the pool of its prefix, matching whole path segments")
def _():
    router = mod.Router([
        {"prefix": "/static", "pool": "cdn"},
        {"prefix": "/api", "pool": "api"},
        {"prefix": "/", "pool": "web"},
    ])
    pools = {path: router.route(path) for path in ["/api", "/api/users/7", "/static/app.js", "/apiary"]}
    assert pools == {"/api": "api", "/api/users/7": "api", "/static/app.js": "cdn", "/apiary": "web"}
    unmatched = mod.Router([{"prefix": "/api", "pool": "api"}]).route("/admin")
    assert unmatched is None


# beginner mistake: taking the first matching prefix instead of the longest one
@test("route lets the longest matching prefix win, whatever the order of the routes")
def _():
    router = mod.Router([
        {"prefix": "/", "pool": "web"},
        {"prefix": "/api", "pool": "api"},
        {"prefix": "/api/v2", "pool": "api-v2"},
    ])
    pools = {path: router.route(path) for path in ["/api/v2/orders", "/api/v1/orders", "/about"]}
    assert pools == {"/api/v2/orders": "api-v2", "/api/v1/orders": "api", "/about": "web"}
    reversed_router = mod.Router([
        {"prefix": "/api/v2", "pool": "api-v2"},
        {"prefix": "/api", "pool": "api"},
    ])
    pools = {path: reversed_router.route(path) for path in ["/api/v2/users", "/api/users"]}
    assert pools == {"/api/v2/users": "api-v2", "/api/users": "api"}


@test("pick sends each request to the less loaded of two sampled backends")
def _():
    balancer = mod.P2CBalancer(["a", "b", "c", "d"], sequence(0, 0, 0, 0, 0.5, 0.9, 0, 0.99, 0.25, 0))
    picks = [balancer.pick() for _ in range(4)]
    assert picks == ["a", "b", "c", "d"]
    counts = [balancer.in_flight(name) for name in ["a", "b", "c", "d"]]
    assert counts == [1, 1, 1, 1]
    balancer.release("a")
    picked = balancer.pick()
    assert picked == "a"
    count = balancer.in_flight("a")
    assert count == 1


@test("pick samples two distinct backends, breaks ties with the first sample and release never goes below zero")
async def _():
    pair = mod.P2CBalancer(["x", "y"], sequence(0.1, 0.1, 0.1, 0.1))
    picks = [pair.pick(), pair.pick()]
    assert picks == ["x", "y"]
    pair.release("y")
    pair.release("y")
    pair.release("ghost")
    counts = [pair.in_flight("y"), pair.in_flight("ghost")]
    assert counts == [0, 0]
    solo = mod.P2CBalancer(["solo"], lambda: 0.5).pick()
    assert solo == "solo"
    error = await capture_error(lambda: mod.P2CBalancer([], lambda: 0.5).pick())
    assert isinstance(error, RuntimeError), f"expected a RuntimeError, got {error!r}"
    assert str(error) == "no backends"
