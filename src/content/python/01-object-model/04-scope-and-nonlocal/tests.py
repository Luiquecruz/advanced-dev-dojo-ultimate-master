import ast


@test("make_counter returns the current value and advances by step")
def _():
    next_value, reset = mod.make_counter(10, 5)
    values = [next_value(), next_value(), next_value()]
    assert values == [10, 15, 20]


@test("make_counter defaults to start 0 and step 1")
def _():
    next_value, reset = mod.make_counter()
    values = [next_value(), next_value()]
    assert values == [0, 1]


@test("each counter keeps its own state")
def _():
    first, reset_first = mod.make_counter()
    second, reset_second = mod.make_counter()
    first()
    first()
    assert second() == 0
    assert first() == 2


# beginner mistake: assigning the counter in reset without nonlocal, which creates a new local and leaves the counter unchanged
@test("reset restores the starting value")
def _():
    next_value, reset = mod.make_counter(7)
    next_value()
    next_value()
    reset()
    assert next_value() == 7


@test("make_history keeps the last values as a tuple, oldest first")
def _():
    record, entries = mod.make_history(3)
    for value in [1, 2, 3, 4, 5]:
        record(value)
    result = entries()
    assert result == (3, 4, 5)
    assert type(result) is tuple


@test("the solution uses nonlocal and never global")
def _():
    tree = ast.parse(source)
    nonlocal_statements = [node for node in ast.walk(tree) if isinstance(node, ast.Nonlocal)]
    global_statements = [node for node in ast.walk(tree) if isinstance(node, ast.Global)]
    assert len(nonlocal_statements) > 0
    assert global_statements == []
