def price(amount, quantity, *, discount=0):
    return amount * quantity - discount


def echo_keywords(**kwargs):
    return kwargs


class Flaky:
    def __init__(self, failures):
        self.failures = failures
        self.calls = 0
        self.received = []

    def __call__(self, *args, **kwargs):
        self.calls += 1
        self.received.append((args, kwargs))
        if self.calls <= self.failures:
            raise ConnectionError(f"attempt {self.calls} failed")
        return "ok"


# beginner mistake: function(args, kwargs) passes one tuple and one dict instead of unpacking them
@test("forward unpacks positional and keyword arguments into the call")
def _():
    result, record = mod.forward(price, 10, 3, discount=5)
    assert result == 25
    assert record["args"] == (10, 3)
    assert record["kwargs"] == {"discount": 5}


@test("forward passes a keyword argument named function through to the callee")
def _():
    result, record = mod.forward(echo_keywords, function="report", retries=2)
    assert result == {"function": "report", "retries": 2}
    assert record["args"] == ()


@test("retry_call keeps attempts for itself and forwards every other argument")
def _():
    flaky = Flaky(failures=1)
    result = mod.retry_call(flaky, "orders", attempts=3, timeout=5)
    assert result == "ok"
    first_call = flaky.received[0]
    assert first_call == (("orders",), {"timeout": 5})


@test("retry_call stops on the first success and re-raises the last error")
async def _():
    flaky = Flaky(failures=2)
    result = mod.retry_call(flaky)
    assert result == "ok"
    assert flaky.calls == 3
    always = Flaky(failures=10)
    error = await capture_error(lambda: mod.retry_call(always, attempts=2))
    assert isinstance(error, ConnectionError)
    assert "attempt 2" in str(error)
    assert always.calls == 2


@test("compose applies functions left to right and is the identity with none")
def _():
    pipeline = mod.compose(str.strip, str.lower, len)
    assert pipeline("  Hello ") == 5
    ordered = mod.compose(lambda value: value + 1, lambda value: value * 10)
    assert ordered(2) == 30
    identity = mod.compose()
    marker = object()
    assert identity(marker) is marker
