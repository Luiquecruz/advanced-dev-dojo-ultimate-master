def pick(balancer, count):
    return [balancer.next() for _ in range(count)]


@test("next() walks the servers in order and wraps around")
def _():
    balancer = mod.RoundRobin(["a", "b", "c"])
    picked = pick(balancer, 7)
    assert picked == ["a", "b", "c", "a", "b", "c", "a"]
    healthy = balancer.healthy()
    assert healthy == ["a", "b", "c"]


# beginner mistake: rotating over a shrinking healthy list by counter, or skipping only one server, so a down server is hit or a healthy one is skipped
@test("after servers go down mid-rotation, next() continues with the next healthy server and never picks a down one")
def _():
    balancer = mod.RoundRobin(["a", "b", "c", "d", "e"])
    picked = pick(balancer, 2)
    assert picked == ["a", "b"]
    balancer.mark_down("a")
    balancer.mark_down("c")
    balancer.mark_down("d")
    picked = pick(balancer, 4)
    assert picked == ["e", "b", "e", "b"]
    healthy = balancer.healthy()
    assert healthy == ["b", "e"]
    balancer.mark_down("b")
    balancer.mark_up("a")
    picked = pick(balancer, 3)
    assert picked == ["e", "a", "e"]


@test("marking a server up puts it back at its place in the rotation")
def _():
    balancer = mod.RoundRobin(["a", "b", "c"])
    balancer.mark_down("b")
    picked = pick(balancer, 3)
    assert picked == ["a", "c", "a"]
    balancer.mark_up("b")
    picked = pick(balancer, 4)
    assert picked == ["b", "c", "a", "b"]
    healthy = balancer.healthy()
    assert healthy == ["a", "b", "c"]


@test('next() fails with "no healthy servers" when every server is down, and recovers once a server is marked up')
async def _():
    balancer = mod.RoundRobin(["a", "b"])
    balancer.mark_down("a")
    balancer.mark_down("b")
    error = await capture_error(balancer.next)
    assert isinstance(error, RuntimeError)
    assert str(error) == "no healthy servers"
    healthy = balancer.healthy()
    assert healthy == []
    balancer.mark_up("b")
    picked = pick(balancer, 2)
    assert picked == ["b", "b"]
    empty_pool_error = await capture_error(mod.RoundRobin([]).next)
    assert isinstance(empty_pool_error, RuntimeError)
    assert str(empty_pool_error) == "no healthy servers"
