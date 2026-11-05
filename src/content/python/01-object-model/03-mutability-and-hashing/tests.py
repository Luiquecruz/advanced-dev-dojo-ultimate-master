# beginner mistake: converting only the outer container (tuple(value) or frozenset(value.items())), so the lists inside keep it unhashable
@test("freeze returns a hashable value, even for nested lists and dicts")
def _():
    frozen = mod.freeze({"tags": ["a", "b"], "limits": {"max": 3}})
    digest = hash(frozen)
    assert type(digest) is int


@test("freeze gives equal results for equal nested data, whatever the key order")
def _():
    first = mod.freeze({"a": [1, 2], "b": {"x": 1}})
    second = mod.freeze({"b": {"x": 1}, "a": [1, 2]})
    assert first == second
    assert hash(first) == hash(second)


@test("freeze converts lists to tuples and does not modify its input")
def _():
    data = [1, [2, 3]]
    frozen = mod.freeze(data)
    assert frozen == (1, (2, 3))
    assert data == [1, [2, 3]]


@test("freeze turns a set into a frozenset")
def _():
    frozen = mod.freeze({1, 2})
    assert frozen == frozenset({1, 2})
    assert type(frozen) is frozenset


@test("freeze raises TypeError naming the unsupported type")
async def _():
    class Widget:
        pass

    error = await capture_error(lambda: mod.freeze(Widget()))
    assert isinstance(error, TypeError)
    assert "Widget" in str(error)


@test("cache_key gives equal keys for equal arguments, whatever the keyword order")
def _():
    cache = {}
    cache[mod.cache_key(([1, 2],), {"scale": 2, "unit": "EUR"})] = 6
    same = mod.cache_key(([1, 2],), {"unit": "EUR", "scale": 2})
    other = mod.cache_key(([1, 3],), {"scale": 2, "unit": "EUR"})
    assert same in cache
    assert other not in cache
