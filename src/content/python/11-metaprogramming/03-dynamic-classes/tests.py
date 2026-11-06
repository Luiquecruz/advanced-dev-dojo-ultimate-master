import collections


@test("records accept fields by position or keyword and reject unknown, missing, extra or repeated values")
async def _():
    LineItem = mod.make_record_class("LineItem", ["sku", "quantity"])
    by_position = LineItem("A-1", 3)
    by_keyword = LineItem(quantity=3, sku="A-1")
    mixed = LineItem("A-1", quantity=3)
    values = [(item.sku, item.quantity) for item in (by_position, by_keyword, mixed)]
    assert values == [("A-1", 3), ("A-1", 3), ("A-1", 3)]
    unknown = await capture_error(lambda: LineItem("A-1", 3, price=9))
    missing = await capture_error(lambda: LineItem("A-1"))
    extra = await capture_error(lambda: LineItem("A-1", 3, 9))
    repeated = await capture_error(lambda: LineItem("A-1", sku="B-2"))
    kinds = [type(error).__name__ for error in (unknown, missing, extra, repeated)]
    assert kinds == ["TypeError", "TypeError", "TypeError", "TypeError"]
    assert "price" in str(unknown)
    assert "quantity" in str(missing)
    assert "sku" in str(repeated)


# beginner mistake: a class statement inside the factory, so every generated class is named Record
@test("the class carries the requested name, a repr built from its fields and positional match support")
def _():
    LineItem = mod.make_record_class("LineItem", ["sku", "quantity"])
    item = LineItem("A-1", 3)
    class_name = type(item).__name__
    qualified_name = LineItem.__qualname__
    text = repr(item)
    match item:
        case LineItem(sku, quantity):
            matched = (sku, quantity)
        case _:
            matched = None
    assert class_name == "LineItem"
    assert qualified_name == "LineItem"
    assert text == "LineItem(sku='A-1', quantity=3)"
    assert matched == ("A-1", 3)


@test("records compare by class and field values, and never equal a plain tuple the way a namedtuple does")
def _():
    LineItem = mod.make_record_class("LineItem", ["sku", "quantity"])
    LookAlike = mod.make_record_class("LineItem", ["sku", "quantity"])
    NamedItem = collections.namedtuple("NamedItem", ["sku", "quantity"])
    same_values = LineItem("A-1", 3) == LineItem("A-1", 3)
    other_values = LineItem("A-1", 3) == LineItem("A-1", 4)
    other_class = LineItem("A-1", 3) == LookAlike("A-1", 3)
    record_and_tuple = LineItem("A-1", 3) == ("A-1", 3)
    namedtuple_and_tuple = NamedItem("A-1", 3) == ("A-1", 3)
    assert same_values
    assert not other_values
    assert not other_class
    assert not record_and_tuple
    assert namedtuple_and_tuple


@test("instances keep their fields in __slots__, with no __dict__ and no attributes outside the fields")
async def _():
    LineItem = mod.make_record_class("LineItem", ["sku", "quantity"])
    item = LineItem("A-1", 3)
    item.quantity = 5
    slots = tuple(getattr(LineItem, "__slots__", ()))
    has_dict = hasattr(item, "__dict__")
    error = await capture_error(lambda: setattr(item, "price", 9))
    assert slots == ("sku", "quantity")
    assert not has_dict
    assert item.quantity == 5
    assert isinstance(error, AttributeError)


@test("invalid or repeated field names raise ValueError when the class is made")
async def _():
    kinds = []
    for fields in (["sku", "sku"], ["sku", "class"], ["2nd"], ["unit price"]):
        error = await capture_error(lambda: mod.make_record_class("Broken", fields))
        kinds.append(type(error).__name__)
    assert kinds == ["ValueError", "ValueError", "ValueError", "ValueError"]
