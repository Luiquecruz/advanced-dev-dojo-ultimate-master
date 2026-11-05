@test("line_total multiplies the price by the quantity")
def _():
    total = mod.line_total(1250, 3)
    assert total == 3750
    single = mod.line_total(399, 1)
    assert single == 399


# beginner mistake: dividing with / so the share is a float such as 333.33 instead of whole cents
@test("split_evenly returns whole cents for each person and the cents left over")
def _():
    share, remainder = mod.split_evenly(1000, 3)
    assert share == 333
    assert remainder == 1
    assert type(share) is int
    exact_share, exact_remainder = mod.split_evenly(900, 3)
    assert exact_share == 300
    assert type(exact_share) is int
    assert exact_remainder == 0


@test("format_cents shows two decimals and the currency")
def _():
    assert mod.format_cents(1250) == "12.50 EUR"
    assert mod.format_cents(7) == "0.07 EUR"
    assert mod.format_cents(100000) == "1000.00 EUR"


@test("kind_of names the type of numbers and text")
def _():
    assert mod.kind_of(3) == "int"
    assert mod.kind_of(2.5) == "float"
    assert mod.kind_of("3") == "str"


@test("print_receipt prints the line and the total and returns nothing")
def _():
    lines = capture_output()
    result = mod.print_receipt("mug", 1250, 3)
    assert result is None
    assert len(lines) == 2
    first = lines[0]
    second = lines[1]
    assert "3 x mug" in first
    assert "37.50 EUR" in second
