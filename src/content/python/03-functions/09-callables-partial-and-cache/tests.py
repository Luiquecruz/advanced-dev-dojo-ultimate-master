from functools import partial
from operator import itemgetter


@test("a Pipeline is callable and applies its steps in order")
def _():
    parse = mod.Pipeline(str.strip, partial(str.split, sep=","), itemgetter(1), str.upper)
    assert callable(parse)
    result = parse("  ada,linus,grace \n")
    assert result == "LINUS"
    empty = mod.Pipeline()
    marker = object()
    assert empty(marker) is marker


# beginner mistake: then appends to self and returns self, so every derived pipeline aliases the base
@test("then returns a new Pipeline and leaves the original unchanged")
def _():
    base = mod.Pipeline(str.strip)
    shouting = base.then(str.upper)
    whispering = base.then(str.lower)
    assert isinstance(shouting, mod.Pipeline)
    assert shouting is not base
    assert base(" Hi ") == "Hi"
    assert shouting(" Hi ") == "HI"
    assert whispering(" Hi ") == "hi"


@test("render dispatches on the argument type, with subclasses using their parent's handler")
def _():
    assert hasattr(mod.render, "register")
    number = mod.render(7)
    flag = mod.render(True)
    nested = mod.render([1, [2, "x"], 3.5])
    other = mod.render("text")
    assert number == "#7"
    assert flag == "#True"
    assert nested == "[#1, [#2, <str>], <float>]"
    assert other == "<str>"


@test("exchange_rate caches two currencies and evicts the least recently used one")
def _():
    mod.exchange_rate("USD")
    mod.exchange_rate("EUR")
    mod.exchange_rate("USD")
    mod.exchange_rate("GBP")
    mod.exchange_rate("EUR")
    info = mod.exchange_rate.cache_info()
    assert mod.LOOKUPS == ["USD", "EUR", "GBP", "EUR"]
    assert info.hits == 1
    assert info.misses == 4
    assert info.maxsize == 2
    assert info.currsize == 2


@test("Report.total is computed once per instance and stored on that instance")
def _():
    first = mod.Report([10, 20, 30])
    second = mod.Report([1, 2])
    values = (first.total, first.total, second.total)
    assert values == (60, 60, 3)
    assert first.computations == 1
    assert second.computations == 1
    assert "total" in vars(first)
