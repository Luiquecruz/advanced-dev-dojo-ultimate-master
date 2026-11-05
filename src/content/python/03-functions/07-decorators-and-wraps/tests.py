import inspect


def area(width: float, height: float = 1.0, *, unit: str = "m") -> str:
    """Return a rectangle area with its unit."""
    return f"{width * height}{unit}2"


@test("count_calls counts the calls of each decorated function separately")
def _():
    counted = mod.count_calls(area)
    other = mod.count_calls(len)
    start = getattr(counted, "calls", None)
    counted(2)
    counted(3, 4)
    other("abc")
    counted_calls = getattr(counted, "calls", None)
    other_calls = getattr(other, "calls", None)
    assert start == 0
    assert counted_calls == 2
    assert other_calls == 1


# beginner mistake: a bare wrapper without functools.wraps replaces the name, docstring and signature with its own
@test("decorated functions keep the original name, docstring, __wrapped__ and signature")
def _():
    for decorator in (mod.count_calls, mod.require_positive):
        wrapped = decorator(area)
        name = wrapped.__name__
        doc = wrapped.__doc__
        original = getattr(wrapped, "__wrapped__", None)
        signature = str(inspect.signature(wrapped))
        assert name == "area"
        assert doc == "Return a rectangle area with its unit."
        assert original is area
        assert signature == str(inspect.signature(area))


@test("require_positive rejects a missing or non-positive first argument")
async def _():
    checked = mod.require_positive(area)
    for bad in (0, -2):
        error = await capture_error(lambda: checked(bad, 3))
        assert isinstance(error, ValueError)
    missing = await capture_error(lambda: checked(width=2))
    assert isinstance(missing, ValueError)


@test("decorators forward every argument and return the original result untouched")
def _():
    counted = mod.count_calls(area)
    checked = mod.require_positive(area)
    sample = object()
    identity = mod.count_calls(lambda value: value)
    counted_result = counted(2, 3, unit="cm")
    checked_result = checked(2, height=5, unit="km")
    same = identity(sample)
    assert counted_result == "6cm2"
    assert checked_result == "10km2"
    assert same is sample


@test("calling job runs first, then second, then the function itself")
def _():
    before = list(mod.ORDER)
    result = mod.job("backup")
    assert before == []
    assert result == "ran backup"
    assert mod.ORDER == ["first", "second", "job"]
