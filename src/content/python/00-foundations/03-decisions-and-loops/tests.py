import ast


def calls_method(name):
    tree = ast.parse(source)
    return any(
        isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute) and node.func.attr == name
        for node in ast.walk(tree)
    )


# beginner mistake: checking the widest tier first, so small orders are charged the 195-cent price of the 50.00 tier
@test("shipping_cost charges each tier its own price")
def _():
    assert mod.shipping_cost(1000) == 595
    assert mod.shipping_cost(3000) == 395
    assert mod.shipping_cost(7500) == 195
    assert mod.shipping_cost(25000) == 0


@test("shipping_cost moves to the next tier exactly on each boundary")
def _():
    assert mod.shipping_cost(1999) == 595
    assert mod.shipping_cost(2000) == 395
    assert mod.shipping_cost(4999) == 395
    assert mod.shipping_cost(5000) == 195
    assert mod.shipping_cost(9999) == 195
    assert mod.shipping_cost(10000) == 0


@test("fizzbuzz covers 1 to n, n included")
def _():
    result = mod.fizzbuzz(15)
    assert len(result) == 15
    assert result[:5] == ["1", "2", "Fizz", "4", "Buzz"]
    assert result[14] == "FizzBuzz"
    assert result[9] == "Buzz"
    empty = mod.fizzbuzz(0)
    assert empty == []


@test("first_index returns the first position, or None when the target is missing, without .index()")
def _():
    assert mod.first_index(["mug", "pen", "pen"], "pen") == 1
    assert mod.first_index(["mug", "pen"], "mug") == 0
    missing = mod.first_index(["mug", "pen"], "lamp")
    assert missing is None
    assert not calls_method("index")


@test("running_max keeps the largest number seen so far")
def _():
    assert mod.running_max([3, 1, 4, 1, 5]) == [3, 3, 4, 4, 5]
    assert mod.running_max([-5, -2, -9]) == [-5, -2, -2]
    assert mod.running_max([]) == []


@test("pair_up pairs names and scores and stops at the shorter list")
def _():
    assert mod.pair_up(["ana", "bo"], [7, 9]) == ["ana: 7", "bo: 9"]
    assert mod.pair_up(["ana", "bo", "cy"], [7]) == ["ana: 7"]
