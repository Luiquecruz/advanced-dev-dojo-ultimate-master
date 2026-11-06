# beginner mistake: calling the key function (key=len()) instead of passing len itself to sorted
@test("sort_by_length orders words from shortest to longest and keeps ties in their original order")
def _():
    result = mod.sort_by_length(["pear", "fig", "kiwi", "apple", "date"])
    assert result == ["fig", "pear", "kiwi", "date", "apple"]
    single = mod.sort_by_length(["mug"])
    assert single == ["mug"]


@test("sort_by_length returns a new list and leaves the input unchanged")
def _():
    words = ["notebook", "pen", "lamp"]
    result = mod.sort_by_length(words)
    assert words == ["notebook", "pen", "lamp"]
    assert result == ["pen", "lamp", "notebook"]
    assert result is not words


@test("make_multiplier returns functions that each keep their own factor")
def _():
    double = mod.make_multiplier(2)
    triple = mod.make_multiplier(3)
    assert double(5) == 10
    assert triple(5) == 15
    assert double(0) == 0


@test("total adds any number of amounts and takes the currency by keyword")
def _():
    assert mod.total(250, 1000) == "12.50 EUR"
    assert mod.total(199, currency="USD") == "1.99 USD"
    assert mod.total(100, 200, 300, 400) == "10.00 EUR"
    assert mod.total() == "0.00 EUR"


@test("depth counts the levels of nested lists")
def _():
    assert mod.depth(5) == 0
    assert mod.depth([]) == 1
    assert mod.depth([1, 2, 3]) == 1
    assert mod.depth([1, [2, [3]]]) == 3
    assert mod.depth([[1], [[2]], 3]) == 3
