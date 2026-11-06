import ast


def comparisons(text):
    for node in ast.walk(ast.parse(text)):
        if isinstance(node, ast.Compare):
            operands = [node.left, *node.comparators]
            for index, operator in enumerate(node.ops):
                yield node.lineno, operator, operands[index], operands[index + 1]


def is_none(node):
    return isinstance(node, ast.Constant) and node.value is None


def is_value_literal(node):
    return isinstance(node, ast.Constant) and type(node.value) in (int, float, complex, str, bytes)


@test("lookup returns the stored value, even when it is falsy")
def _():
    found = mod.lookup({"a": 0}, "a")
    assert found == 0
    assert mod.lookup({"a": 0}, "a", 99) == 0


@test("lookup separates a missing key from a stored None and an explicit None default")
async def _():
    error = await capture_error(lambda: mod.lookup({}, "k"))
    assert isinstance(error, KeyError)
    assert mod.lookup({}, "k", None) is None
    assert mod.lookup({"k": None}, "k", "fallback") is None


@test("Money compares and hashes by value, so equal amounts collapse in a set")
def _():
    first = mod.Money(100, "EUR")
    second = mod.Money(100, "EUR")
    other = mod.Money(100, "USD")
    assert first == second
    assert first is not second
    assert hash(first) == hash(second)
    prices = {first, second, other}
    assert len(prices) == 2


@test("Money compared with a non-Money is False instead of raising")
def _():
    money = mod.Money(1, "EUR")
    same = money == 1
    different = money != 1
    assert same is False
    assert different is True


# beginner mistake: comparing the amounts with is, which holds only for the small integers CPython caches
@test("same_amount compares the amounts by value, also for large amounts, and ignores the currency")
def _():
    large = mod.Money(int("250000"), "EUR")
    same_large = mod.Money(int("250000"), "USD")
    assert mod.same_amount(large, same_large)
    assert mod.same_amount(mod.Money(5, "EUR"), mod.Money(5, "USD"))
    assert not mod.same_amount(mod.Money(5, "EUR"), mod.Money(6, "EUR"))


@test("the source never compares with None using == or uses is with literals")
def _():
    found = list(comparisons(source))
    equality_with_none = [line for line, operator, left, right in found if isinstance(operator, (ast.Eq, ast.NotEq)) and (is_none(left) or is_none(right))]
    identity_with_literal = [line for line, operator, left, right in found if isinstance(operator, (ast.Is, ast.IsNot)) and (is_value_literal(left) or is_value_literal(right))]
    assert equality_with_none == []
    assert identity_with_literal == []
