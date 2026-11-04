from itertools import islice

LIMIT = 50


def drain(iterable):
    """Reads at most LIMIT items, so an iterator that never raises StopIteration fails fast instead of hanging."""
    return list(islice(iterable, LIMIT))


@test("a Paginator yields every item in page order and a second loop starts again")
def _():
    paginator = mod.Paginator([["a", "b"], [], ["c"], ["d"]])
    first = drain(paginator)
    second = drain(paginator)
    empty = drain(mod.Paginator([[], []]))
    assert first == ["a", "b", "c", "d"]
    assert second == ["a", "b", "c", "d"]
    assert empty == []


@test("two iterators over one Paginator advance independently, so nested loops see every pair")
def _():
    paginator = mod.Paginator([["a", "b"], ["c"]])
    first = iter(paginator)
    second = iter(paginator)
    returns_itself = first is paginator
    head = [next(first), next(first)]
    other_head = next(second)
    pairs = [(left, right) for left in islice(paginator, LIMIT) for right in islice(paginator, LIMIT)]
    assert returns_itself is False
    assert head == ["a", "b"]
    assert other_head == "a"
    assert len(pairs) == 9


@test("a LineReader is its own iterator, counts lines and is empty on a second loop")
def _():
    reader = mod.LineReader(["GET /\n", "POST /orders\n", "GET /health"])
    returns_itself = iter(reader) is reader
    first = next(reader)
    rest = drain(reader)
    again = drain(reader)
    count = reader.line_number
    assert returns_itself is True
    assert first == "GET /"
    assert rest == ["POST /orders", "GET /health"]
    assert again == []
    assert count == 3


@test("next() past the end of a LineReader raises StopIteration on every call")
async def _():
    reader = mod.LineReader(["only\n"])
    line = next(reader)
    first_end = await capture_error(lambda: next(reader))
    second_end = await capture_error(lambda: next(reader))
    fallback = next(reader, "done")
    assert line == "only"
    assert isinstance(first_end, StopIteration)
    assert isinstance(second_end, StopIteration)
    assert fallback == "done"


@test("is_iterator and is_reiterable classify containers, iterators and non-iterables")
def _():
    samples = {
        "list": [1, 2],
        "dict": {"a": 1},
        "str": "abc",
        "range": range(3),
        "Paginator": mod.Paginator([["a"]]),
        "list iterator": iter([1, 2]),
        "generator": (number for number in range(3)),
        "map": map(str, [1]),
        "LineReader": mod.LineReader(["a"]),
        "int": 42,
        "None": None,
    }
    table = {name: (mod.is_iterator(value), mod.is_reiterable(value)) for name, value in samples.items()}
    expected = {
        "list": (False, True),
        "dict": (False, True),
        "str": (False, True),
        "range": (False, True),
        "Paginator": (False, True),
        "list iterator": (True, False),
        "generator": (True, False),
        "map": (True, False),
        "LineReader": (True, False),
        "int": (False, False),
        "None": (False, False),
    }
    assert table == expected
