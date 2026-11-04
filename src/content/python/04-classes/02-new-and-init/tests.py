@test("Currency returns the same object for the same code, in any case")
def _():
    first = mod.Currency("EUR")
    second = mod.Currency("EUR")
    lower = mod.Currency("eur")
    assert first is second
    assert lower is first
    assert first.code == "EUR"


@test("different codes give different Currency objects with their own normalized code")
def _():
    dollar = mod.Currency("usd")
    euro = mod.Currency("EUR")
    assert euro is not dollar
    assert dollar.code == "USD"
    assert euro.code == "EUR"
    upper = mod.Currency("USD")
    assert upper is dollar


@test("__init__ runs on every call but keeps the state of a cached Currency")
def _():
    euro = mod.Currency("EUR")
    euro.rates["USD"] = 1.08
    again = mod.Currency("EUR")
    rates = again.rates
    assert rates == {"USD": 1.08}
    calls = euro.init_calls
    assert calls == 2


@test("Percent rejects values outside 0 to 100 when the object is created")
async def _():
    too_high = await capture_error(lambda: mod.Percent(101))
    assert isinstance(too_high, ValueError)
    assert "100" in str(too_high)
    too_low = await capture_error(lambda: mod.Percent(-0.5))
    assert isinstance(too_low, ValueError)
    edge = mod.Percent(100)
    assert edge == 100.0


@test("Percent accepts numbers and percent strings and arithmetic returns plain floats")
def _():
    parsed = mod.Percent("12.5%")
    assert parsed == 12.5
    assert isinstance(parsed, float)
    assert isinstance(parsed, mod.Percent)
    total = mod.Percent(5) + 1
    assert type(total) is float
    assert total == 6.0
