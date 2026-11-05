import dataclasses


@test("a Product is frozen")
async def _():
    mug = mod.Product("Mug", 900)
    error = await capture_error(lambda: setattr(mug, "price_cents", 1))
    assert isinstance(error, dataclasses.FrozenInstanceError)
    assert mug.price_cents == 900


@test("products order by name and then by price, and tags do not affect equality or hashing")
def _():
    lamp = mod.Product("Lamp", 3000)
    cheap_mug = mod.Product("Mug", 500)
    mug = mod.Product("Mug", 900)
    ordered = sorted([mug, lamp, cheap_mug])
    assert ordered == [lamp, cheap_mug, mug]
    tagged = mod.Product("Mug", 900, ["kitchen"])
    assert tagged == mug
    unique = {mug, tagged, lamp}
    assert len(unique) == 2


@test("__post_init__ validates the price and normalizes the name")
async def _():
    empty = await capture_error(lambda: mod.Product("   ", 100))
    assert isinstance(empty, ValueError)
    negative = await capture_error(lambda: mod.Product("Mug", -1))
    assert isinstance(negative, ValueError)
    padded = mod.Product("  Mug ", 900)
    assert padded.name == "Mug"


@test("each Product gets its own tags list")
def _():
    first = mod.Product("Mug", 900)
    second = mod.Product("Lamp", 3000)
    first.tags.append("kitchen")
    assert second.tags == []
    assert first.tags == ["kitchen"]


@test("with_price returns a new validated product and keeps the other fields")
async def _():
    mug = mod.Product("Mug", 900, ["kitchen"])
    discounted = mod.with_price(mug, 700)
    assert discounted is not mug
    assert mug.price_cents == 900
    assert discounted.price_cents == 700
    assert discounted.name == "Mug"
    assert discounted.tags == ["kitchen"]
    error = await capture_error(lambda: mod.with_price(mug, -5))
    assert isinstance(error, ValueError)
