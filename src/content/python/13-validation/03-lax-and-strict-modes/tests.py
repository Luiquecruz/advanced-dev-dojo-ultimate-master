from pydantic import BaseModel, ValidationError

PARTNER = {"order_id": "17", "quantity": "2", "unit_price": "9.50", "express": "yes", "paid": True}


def error_pairs(error):
    return sorted((tuple(item["loc"]), item["type"]) for item in error.errors())


def type_names(order):
    return [type(getattr(order, name)).__name__ for name in ["order_id", "quantity", "unit_price", "express", "paid"]]


@test("lax parsing converts partner strings to the declared types")
def _():
    order = mod.parse_lax(PARTNER)
    names = type_names(order)
    values = [order.order_id, order.quantity, order.unit_price, order.express, order.paid]
    assert isinstance(order, mod.Order)
    assert values == [17, 2, 9.5, True, True]
    assert names == ["int", "int", "float", "bool", "bool"]


# beginner mistake: paid declared as a plain bool, so lax mode turns "yes" and 1 into True
@test("the paid flag accepts only a real boolean, even in lax mode")
async def _():
    for raw in ["true", 1, "yes"]:
        error = await capture_error(lambda: mod.parse_lax({**PARTNER, "paid": raw}))
        assert isinstance(error, ValidationError), raw
        pairs = error_pairs(error)
        assert pairs == [(("paid",), "bool_type")], raw
    unpaid = mod.parse_lax({**PARTNER, "paid": False})
    assert unpaid.paid is False


@test("strict parsing rejects converted types but accepts an int for a float")
async def _():
    is_subclass = issubclass(mod.StrictOrder, mod.Order) and issubclass(mod.StrictOrder, BaseModel)
    strict_flag = mod.StrictOrder.model_config.get("strict")
    assert is_subclass
    assert strict_flag is True
    error = await capture_error(lambda: mod.parse_strict({**PARTNER, "coupon": "WELCOME"}))
    assert isinstance(error, ValidationError)
    pairs = error_pairs(error)
    assert pairs == [
        (("coupon",), "extra_forbidden"),
        (("express",), "bool_type"),
        (("order_id",), "int_type"),
        (("quantity",), "int_type"),
        (("unit_price",), "float_type"),
    ]
    order = mod.parse_strict({"order_id": 17, "quantity": 2, "unit_price": 3, "paid": True})
    price_type = type(order.unit_price).__name__
    assert isinstance(order, mod.StrictOrder)
    assert price_type == "float"
    flag_error = await capture_error(lambda: mod.parse_strict({"order_id": 17, "quantity": True, "unit_price": 3.0, "paid": True}))
    flag_pairs = error_pairs(flag_error)
    assert flag_pairs == [(("quantity",), "int_type")]


@test("lax errors say the text could not be parsed")
async def _():
    error = await capture_error(lambda: mod.parse_lax({"order_id": "seventeen", "quantity": 1.5, "unit_price": "cheap", "paid": True}))
    assert isinstance(error, ValidationError)
    pairs = error_pairs(error)
    assert pairs == [(("order_id",), "int_parsing"), (("quantity",), "int_from_float"), (("unit_price",), "float_parsing")]


@test("coercions reports each field whose type changed, including int to float and bool to int")
async def _():
    changed = mod.coercions({"order_id": "17", "quantity": True, "unit_price": 3, "express": False, "paid": True})
    exact = mod.coercions({"order_id": 17, "quantity": 2, "unit_price": 3.5, "paid": False})
    assert changed == {"order_id": ("str", "int"), "quantity": ("bool", "int"), "unit_price": ("int", "float")}
    assert exact == {}
    error = await capture_error(lambda: mod.coercions({"order_id": "x", "quantity": 1, "unit_price": 1.0, "paid": True}))
    assert isinstance(error, ValidationError)
