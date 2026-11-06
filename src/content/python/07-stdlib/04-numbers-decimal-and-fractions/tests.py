import math
from decimal import Decimal
from fractions import Fraction


def raised(action):
    """Returns the name of the exception `action` raises, or "nothing"."""
    try:
        action()
    except Exception as error:
        return type(error).__name__
    return "nothing"


# beginner mistake: dividing with / and rounding each share, which loses or invents cents
@test("split_bill hands out every cent as ints, larger shares first")
def _():
    cases = {(1000, 3): [334, 333, 333], (5, 3): [2, 2, 1], (1, 3): [1, 0, 0], (999, 3): [333, 333, 333], (7, 1): [7]}
    for (total, people), expected in cases.items():
        shares = mod.split_bill(total, people)
        kinds = {type(share).__name__ for share in shares}
        assert shares == expected
        assert sum(shares) == total
        assert kinds == {"int"}


@test("split_bill refuses float totals, negative totals and fewer than one person")
def _():
    as_float = raised(lambda: mod.split_bill(10.0, 3))
    negative = raised(lambda: mod.split_bill(-5, 2))
    nobody = raised(lambda: mod.split_bill(100, 0))
    assert as_float == "TypeError"
    assert negative == "ValueError"
    assert nobody == "ValueError"


@test("round_money rounds half up to cents from exact decimal text")
def _():
    float_sum = 0.1 + 0.2
    assert float_sum != 0.3
    assert math.isclose(float_sum, 0.3)
    float_rounded = round(2.675, 2)
    assert float_rounded == 2.67
    rounded = mod.round_money("2.675")
    assert rounded == Decimal("2.68")
    assert type(rounded) is Decimal
    assert mod.round_money(Decimal("2.665")) == Decimal("2.67")
    assert mod.round_money("-2.675") == Decimal("-2.68")
    text = str(mod.round_money(3))
    assert text == "3.00"
    exact = mod.round_money("0.1") + mod.round_money("0.2")
    assert exact == mod.round_money("0.3")


@test("round_money refuses floats, oversized text and text that is not a finite number")
def _():
    as_float = raised(lambda: mod.round_money(2.675))
    assert as_float == "TypeError"
    outcomes = {text[:12]: raised(lambda: mod.round_money(text)) for text in ("abc", "NaN", "Infinity", "9" * 100)}
    assert outcomes == {"abc": "ValueError", "NaN": "ValueError", "Infinity": "ValueError", "999999999999": "ValueError"}


@test("exact_ratio parses exact fractions and refuses oversized or invalid text")
def _():
    assert mod.exact_ratio("0.1") == Fraction(1, 10)
    assert mod.exact_ratio("-3/4") == Fraction(-3, 4)
    total = mod.exact_ratio("1/3") + mod.exact_ratio("1/6")
    assert total == Fraction(1, 2)
    outcomes = {text[:12]: raised(lambda: mod.exact_ratio(text)) for text in ("1" * 100, "1/0", "abc")}
    assert outcomes == {"111111111111": "ValueError", "1/0": "ValueError", "abc": "ValueError"}
    digits_limit = raised(lambda: int("9" * 5000))
    assert digits_limit == "ValueError"
