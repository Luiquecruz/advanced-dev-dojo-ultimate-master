"""Every Python challenge graded under CPython with the real harness: the solution passes every test, the starter fails one.

The same checks run under Pyodide in `npm run verify`; this suite confirms the lessons teach CPython behavior, not
Pyodide quirks. Lessons that use the fake model (`dojo_ai`) are skipped: it runs only in Pyodide.
"""

import importlib.util
import os

import pytest

from lessons import find_challenges, grade

CHALLENGES = find_challenges()
REQUIRED_PACKAGES = ("pydantic",)


def _skip_reason(challenge):
    if challenge.uses_fake_model():
        return "uses the fake model, which runs only in Pyodide"
    for package in REQUIRED_PACKAGES:
        if challenge.imports(package) and importlib.util.find_spec(package) is None and not os.environ.get("CI"):
            return f"{package} is not installed (pip install -r tests/python/requirements.txt)"
    return None


def _params():
    return list(_param_list())


def _param_list():
    for challenge in CHALLENGES:
        reason = _skip_reason(challenge)
        marks = [pytest.mark.skip(reason=reason)] if reason else []
        yield pytest.param(challenge, id=challenge.id, marks=marks)


def _failures(result):
    if "compileError" in result:
        return [result["compileError"]]
    return [f'{entry["name"]}: {entry.get("error", "")}' for entry in result["results"] if not entry["passed"]]


def test_finds_the_python_challenges():
    assert len(CHALLENGES) >= 100


@pytest.mark.parametrize("challenge", _params())
def test_solution_passes_every_test(challenge):
    result = grade(challenge, "solution")
    assert _failures(result) == []
    assert len(result["results"]) > 0


@pytest.mark.parametrize("challenge", _params())
def test_starter_fails_at_least_one_test(challenge):
    result = grade(challenge, "starter")
    assert _failures(result), "the starter passes every test"
