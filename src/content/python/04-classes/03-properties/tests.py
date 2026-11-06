@test("the three scales convert from and to Celsius")
def _():
    boiling = mod.Temperature(100)
    assert boiling.fahrenheit == approx(212.0)
    assert boiling.kelvin == approx(373.15)
    boiling.fahrenheit = 32
    assert boiling.celsius == approx(0.0)
    assert boiling.kelvin == approx(273.15)


# beginner mistake: __init__ assigns self._celsius directly, so construction skips the setter's validation
@test("validation runs on construction and on every write path")
async def _():
    on_create = await capture_error(lambda: mod.Temperature(-300))
    assert isinstance(on_create, ValueError)
    assert "absolute zero" in str(on_create)
    reading = mod.Temperature(20)
    on_celsius = await capture_error(lambda: setattr(reading, "celsius", -274))
    assert isinstance(on_celsius, ValueError)
    on_fahrenheit = await capture_error(lambda: setattr(reading, "fahrenheit", -500))
    assert isinstance(on_fahrenheit, ValueError)
    assert reading.celsius == approx(20.0)


@test("kelvin is read-only and every scale is a property on the class")
async def _():
    reading = mod.Temperature(10)
    error = await capture_error(lambda: setattr(reading, "kelvin", 0))
    assert isinstance(error, AttributeError)
    assert reading.kelvin == approx(283.15)
    for name in ["celsius", "fahrenheit", "kelvin"]:
        attribute = vars(mod.Temperature).get(name)
        assert isinstance(attribute, property)


@test("deleting celsius resets the temperature to zero")
def _():
    reading = mod.Temperature(37.5)
    del reading.celsius
    assert reading.celsius == approx(0.0)
    assert reading.fahrenheit == approx(32.0)
