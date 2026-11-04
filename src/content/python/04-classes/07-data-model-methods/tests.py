def eur(cents):
    return mod.Money(cents, "EUR")


@test("repr shows the constructor call and format applies the spec to the amount")
def _():
    price = eur(1050)
    text = repr(price)
    assert text == "Money(1050, 'EUR')"
    two_places = format(price, ".2f")
    assert two_places == "10.50 EUR"
    one_place = f"{price:.1f}"
    assert one_place == "10.5 EUR"
    plain = str(price)
    assert plain == "10.50 EUR"


@test("equal amounts collapse in a set and other currencies or types are never equal")
def _():
    unique = {eur(100), eur(100), mod.Money(100, "eur"), eur(250)}
    assert len(unique) == 2
    assert hash(eur(100)) == hash(mod.Money(100, "eur"))
    assert eur(100) != mod.Money(100, "USD")
    assert eur(100) != 100


@test("amounts in one currency sort and compare")
def _():
    amounts = [eur(300), eur(-50), eur(120)]
    ordered = sorted(amounts)
    assert ordered == [eur(-50), eur(120), eur(300)]
    assert eur(5) <= eur(5)
    assert eur(6) > eur(5)
    largest = max(amounts)
    assert largest == eur(300)


@test("comparing or adding different currencies raises TypeError")
async def _():
    dollars = mod.Money(100, "USD")
    on_compare = await capture_error(lambda: eur(100) < dollars)
    assert isinstance(on_compare, TypeError)
    on_add = await capture_error(lambda: eur(100) + dollars)
    assert isinstance(on_add, TypeError)


@test("adding a value that is not Money raises TypeError through NotImplemented")
async def _():
    right = await capture_error(lambda: eur(100) + 1)
    assert isinstance(right, TypeError)
    left = await capture_error(lambda: 1.5 + eur(100))
    assert isinstance(left, TypeError)
    result = eur(100).__add__(1)
    assert result is NotImplemented


@test("sum works from a zero start and from the default start, and zero is falsy")
def _():
    items = [eur(100), eur(250), eur(250)]
    with_start = sum(items, start=mod.Money.zero("EUR"))
    assert with_start == eur(600)
    default_start = sum(items)
    assert default_start == eur(600)
    assert not mod.Money.zero("EUR")
    assert bool(eur(1))
