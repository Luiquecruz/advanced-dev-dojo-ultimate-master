import ast
import unittest

MUTANTS = {
    "threshold": ("if quantity >= BULK_THRESHOLD:", "if quantity > BULK_THRESHOLD:"),
    "zero quantity": ("if quantity <= 0:", "if quantity < 0:"),
    "ignored rate": ("total = round(total * fetch_rate(currency))", "fetch_rate(currency)"),
    "wrong currency": ("total = round(total * fetch_rate(currency))", "total = round(total * fetch_rate(currency.lower()))"),
}


def run_mutant(kind):
    """Runs the learner's suite after planting one bug inside the real pricing module, then restores it.

    The bug is planted in place, so every reference the suite holds (`pricing`, `mock.patch.object(pricing, ...)`
    evaluated when the class was defined, the "pricing.fetch_rate" target string) reaches the broken code.
    """
    original, replacement = MUTANTS[kind]
    text = sources["pricing.py"]
    assert original in text, "pricing.py was edited: the tests plant bugs in the original file, so restore it"
    real = modules["pricing.py"]
    saved = dict(real.__dict__)
    exec(compile(text.replace(original, replacement), real.__file__, "exec"), real.__dict__)
    real.InvalidQuote = saved["InvalidQuote"]
    try:
        return mod.run_suite()
    finally:
        real.__dict__.clear()
        real.__dict__.update(saved)


def problems(result):
    return [f"{test}: {trace.strip().splitlines()[-1]}" for test, trace in result.failures + result.errors]


def name_of(node):
    return node.attr if isinstance(node, ast.Attribute) else getattr(node, "id", None)


def patch_calls():
    """Calls to patch(...), mock.patch(...) or patch.object(...), as a context manager or a decorator."""
    found = []
    for node in ast.walk(ast.parse(source)):
        if not isinstance(node, ast.Call):
            continue
        function = node.func
        if name_of(function) == "patch":
            found.append(node)
        elif isinstance(function, ast.Attribute) and function.attr == "object" and name_of(function.value) == "patch":
            found.append(node)
    return found


def used_as_context_manager(method_name):
    for node in ast.walk(ast.parse(source)):
        if isinstance(node, ast.With):
            for item in node.items:
                call = item.context_expr
                if isinstance(call, ast.Call) and isinstance(call.func, ast.Attribute) and call.func.attr == method_name:
                    return True
    return False


@test("run_suite runs at least three tests against the real pricing module and all of them pass")
def _():
    result = mod.run_suite()
    assert isinstance(result, unittest.TestResult)
    tests_run = result.testsRun
    assert tests_run >= 3
    broken = problems(result)
    assert broken == []


@test("the suite fails against a copy of pricing whose bulk discount starts one unit late")
def _():
    result = run_mutant("threshold")
    caught = not result.wasSuccessful()
    assert caught, "no test noticed that 100 units no longer get the discount"


@test("the suite fails against a copy of pricing that accepts a zero quantity")
def _():
    result = run_mutant("zero quantity")
    caught = not result.wasSuccessful()
    assert caught, "no test noticed that quote(250, 0) no longer raises InvalidQuote"


@test("the suite fails when the conversion ignores the rate or asks for the wrong currency, and never calls the real fetch_rate")
def _():
    ignored = run_mutant("ignored rate")
    ignored_caught = not ignored.wasSuccessful()
    assert ignored_caught, "no test noticed that a EUR quote no longer applies the rate"
    wrong = run_mutant("wrong currency")
    wrong_caught = not wrong.wasSuccessful()
    assert wrong_caught, "no test noticed that fetch_rate received 'eur' instead of 'EUR'"
    mod.run_suite()
    real_calls = list(modules["rates.py"].calls)
    assert real_calls == []


@test("the suite uses assertRaises as a context manager, subTest for the table and patch for fetch_rate")
def _():
    assert used_as_context_manager("assertRaises")
    assert used_as_context_manager("subTest")
    patches = patch_calls()
    assert len(patches) >= 1
