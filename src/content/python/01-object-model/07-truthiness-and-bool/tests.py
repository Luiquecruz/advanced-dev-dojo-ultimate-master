@test("an empty Basket is falsy and a Basket with items is truthy")
def _():
    empty = mod.Basket()
    full = mod.Basket(["book"])
    assert bool(empty) is False
    assert bool(full) is True
    assert len(full) == 1


@test("Quota is truthy while capacity remains")
def _():
    assert bool(mod.Quota(3, 2)) is True
    assert bool(mod.Quota(3, 3)) is False
    assert bool(mod.Quota(0, 0)) is False


@test("Quota has no length")
async def _():
    error = await capture_error(lambda: len(mod.Quota(1, 0)))
    assert isinstance(error, TypeError)


@test("coalesce keeps falsy values and only skips None")
def _():
    assert mod.coalesce(None, 0, 5) == 0
    assert mod.coalesce(None, "", "x") == ""
    assert mod.coalesce(None, [], [1]) == []
    assert mod.coalesce(None, None) is None
    assert mod.coalesce() is None


@test("first_truthy skips every falsy value and falls back to the default")
def _():
    assert mod.first_truthy(0, "", [], "x") == "x"
    assert mod.first_truthy(0, "", default="d") == "d"
    assert mod.first_truthy() is None
