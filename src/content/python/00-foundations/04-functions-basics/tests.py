import ast


def function_calls(function_name, called_name):
    tree = ast.parse(source)
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef) and node.name == function_name:
            return any(
                isinstance(inner, ast.Call) and isinstance(inner.func, ast.Name) and inner.func.id == called_name
                for inner in ast.walk(node)
            )
    return False


@test("apply_discount takes off 10 per cent when no percent is given")
def _():
    assert mod.apply_discount(2000) == 1800
    assert mod.apply_discount(999) == 900


@test("apply_discount accepts percent as a keyword argument and rounds the discount down to whole cents")
def _():
    assert mod.apply_discount(2000, percent=25) == 1500
    assert mod.apply_discount(price_cents=1999, percent=50) == 1000
    assert mod.apply_discount(500, percent=0) == 500


# beginner mistake: printing the three values instead of returning them, so the call gives back None
@test("stats returns the lowest number, the mean and the highest number")
def _():
    result = mod.stats([2, 4, 9])
    assert result == (2, 5.0, 9)
    lowest, mean, highest = mod.stats([7])
    assert lowest == 7
    assert mean == 7.0
    assert highest == 7


@test("stats returns three Nones for an empty list")
def _():
    result = mod.stats([])
    assert result == (None, None, None)


@test("bounds builds its text from the values stats returns")
def _():
    assert function_calls("bounds", "stats")
    assert mod.bounds([4, 9, 2]) == "2 to 9"
    assert mod.bounds([-3, 3]) == "-3 to 3"
    assert mod.bounds([]) == "no numbers"
