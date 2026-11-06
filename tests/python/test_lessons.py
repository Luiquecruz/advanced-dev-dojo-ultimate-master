"""Every Python challenge graded under CPython with the real harness: the solution passes every test, the starter fails one.

The same checks run under Pyodide in `npm run verify`; this suite confirms the lessons teach CPython behavior, not
Pyodide quirks. Lessons that use the fake model (`dojo_ai`) are skipped: it runs only in Pyodide. Use is read from the code with
`ast` (`Challenge.uses_fake_model`), so a learner name that only resembles the fake model's does not skip a lesson.
"""

import importlib.util
import os
import textwrap

import pytest

from lessons import Challenge, find_challenges, grade

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


def _lesson(tmp_path, main, tests):
    (tmp_path / "solution").mkdir()
    (tmp_path / "solution" / "main.py").write_text(textwrap.dedent(main))
    return Challenge("synthetic/lesson", tmp_path, "main.py", textwrap.dedent(tests))


def test_grades_a_lesson_whose_own_names_only_resemble_the_fake_model(tmp_path):
    challenge = _lesson(
        tmp_path,
        """\
        # A handler, not the dojo_ai fake model: fake_model and for_each_seed appear only in this comment.
        def respond(status):
            return {"status": status}


        class Handler:
            def _respond(self, status):
                return respond(status)
        """,
        """
        @test("answers with the status")
        def _():
            assert mod.Handler()._respond(200) == {"status": 200}
        """,
    )
    assert _skip_reason(challenge) is None


@pytest.mark.parametrize(
    ("main", "tests"),
    [
        ("from dojo_ai import create_model\n", '@test("creates a model")\ndef _():\n    assert mod.create_model\n'),
        ("def answer(text):\n    return text\n", '@test("answers")\ndef _():\n    fake_model.reply(respond.text("Paris"))\n'),
    ],
    ids=["the solution imports dojo_ai", "the tests use the fake model globals"],
)
def test_skips_a_lesson_that_uses_the_fake_model(tmp_path, main, tests):
    assert _skip_reason(_lesson(tmp_path, main, tests)) == "uses the fake model, which runs only in Pyodide"


@pytest.mark.parametrize("challenge", _params())
def test_solution_passes_every_test(challenge):
    result = grade(challenge, "solution")
    assert _failures(result) == []
    assert len(result["results"]) > 0


@pytest.mark.parametrize("challenge", _params())
def test_starter_fails_at_least_one_test(challenge):
    result = grade(challenge, "starter")
    assert _failures(result), "the starter passes every test"
