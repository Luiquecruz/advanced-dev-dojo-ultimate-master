@test("add_item mutates the list that was passed in")
def _():
    cart = ["book"]
    mod.add_item(cart, "pen")
    assert cart == ["book", "pen"]


@test("add_item returns the same list object")
def _():
    cart = ["book"]
    result = mod.add_item(cart, "pen")
    assert result is cart


@test("snapshot is a new list that ignores later changes to the cart")
def _():
    cart = ["book"]
    saved = mod.snapshot(cart)
    cart.append("pen")
    assert saved == ["book"]
    assert saved is not cart


@test("merge_carts returns a new list and leaves both inputs unchanged")
def _():
    first = ["book"]
    second = ["pen"]
    merged = mod.merge_carts(first, second)
    assert merged == ["book", "pen"]
    assert first == ["book"]
    assert second == ["pen"]
    assert merged is not first
    assert merged is not second


@test("empty_carts returns independent lists")
def _():
    carts = mod.empty_carts(3)
    carts[0].append("lamp")
    assert len(carts) == 3
    assert carts[1] == []
    assert carts[2] == []
