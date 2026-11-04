@test("freeze returns a hashable value")
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


@test("memoize_by_value reuses results for equal list arguments")
def _():
    def total(items, scale=1):
        return sum(items) * scale

    cached = mod.memoize_by_value(total)
    assert cached([1, 2], scale=2) == 6
    assert cached([1, 2], scale=2) == 6
    assert cached.calls == 1
    assert cached([1, 3], scale=2) == 8
    assert cached.calls == 2
