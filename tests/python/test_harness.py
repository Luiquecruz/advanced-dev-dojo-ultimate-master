"""The grading harness under CPython: test discovery, failure messages, test isolation and its safety guard."""

import json
import os
import subprocess
import sys
import textwrap

from lessons import RUNNER, Challenge, grade, listed_test_names


def _challenge(tmp_path, main, tests):
    for variant in ("solution", "starter"):
        (tmp_path / variant).mkdir()
        (tmp_path / variant / "main.py").write_text(textwrap.dedent(main))
    return Challenge("synthetic/lesson", tmp_path, "main.py", textwrap.dedent(tests))


def test_lists_top_level_test_names_in_order():
    source = textwrap.dedent(
        """
        @test("first")
        def _():
            pass

        @test('second, with "quotes"')
        async def _():
            pass

        # @test("commented out")
        """
    )
    assert listed_test_names(source) == ["first", 'second, with "quotes"']


def test_reports_both_sides_of_a_failed_comparison(tmp_path):
    challenge = _challenge(
        tmp_path,
        "def total(items):\n    return sum(items) + 1\n",
        """
        @test("adds the items")
        def _():
            total = mod.total([1, 2])
            assert total == 3
        """,
    )
    [result] = grade(challenge, "solution")["results"]
    assert result["passed"] is False
    assert "assert total == 3" in result["error"]
    assert "left:  4" in result["error"]
    assert "right: 3" in result["error"]


def test_offers_approx_and_capture_error_to_tests(tmp_path):
    challenge = _challenge(
        tmp_path,
        "def ratio(a, b):\n    return a / b\n",
        """
        @test("divides")
        def _():
            assert mod.ratio(1, 3) == approx(0.333333, abs=1e-6)

        @test("rejects zero")
        async def _():
            error = await capture_error(lambda: mod.ratio(1, 0))
            assert isinstance(error, ZeroDivisionError)
        """,
    )
    assert [entry["passed"] for entry in grade(challenge, "solution")["results"]] == [True, True]


def test_each_test_gets_a_fresh_import_and_a_clean_scratch_directory(tmp_path):
    challenge = _challenge(
        tmp_path,
        "import os\nCALLS = []\n",
        """
        import os

        @test("leaves state behind")
        def _():
            mod.CALLS.append(1)
            open(os.path.join(os.environ["DOJO_SCRATCH_DIRECTORIES"], "left-over.txt"), "w").close()

        @test("does not see it")
        def _():
            assert mod.CALLS == []
            assert os.listdir(os.environ["DOJO_SCRATCH_DIRECTORIES"]) == []
        """,
    )
    assert [entry["passed"] for entry in grade(challenge, "solution")["results"]] == [True, True]


def test_reports_a_syntax_error_without_running_tests(tmp_path):
    challenge = _challenge(tmp_path, "def broken(:\n", '@test("never runs")\ndef _():\n    pass\n')
    result = grade(challenge, "solution")
    assert result["results"] == []
    assert "SyntaxError" in result["compileError"]


def test_grades_with_hash_seed_zero_like_pyodide(tmp_path):
    challenge = _challenge(
        tmp_path,
        "def order():\n    return list({'pear', 'apple', 'fig', 'kiwi', 'plum', 'date'})\n",
        """
        import sys

        @test("hash randomization is off")
        def _():
            assert sys.flags.hash_randomization == 0
            assert hash("abc") == hash("abc")
        """,
    )
    first = grade(challenge, "solution")
    assert [entry["passed"] for entry in first["results"]] == [True], first


def test_runner_refuses_to_start_without_temporary_directories(tmp_path):
    environment = {key: value for key, value in os.environ.items() if not key.startswith("DOJO_")}
    completed = subprocess.run(
        [sys.executable, "-s", "-P", str(RUNNER), str(tmp_path / "result.json")],
        input=json.dumps({"files": {}, "entry": "main.py", "tests": "", "names": []}),
        capture_output=True,
        text=True,
        env=environment,
    )
    assert completed.returncode != 0
    assert "DOJO_SCRATCH_DIRECTORIES" in completed.stderr
    assert not (tmp_path / "result.json").exists()
