"""Finds the Python challenges in src/content and grades them with the harness under CPython in a child process."""

import ast
import json
import os
import subprocess
import symtable
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONTENT = ROOT / "src" / "content"
RUNNER = Path(__file__).resolve().parent / "run_lesson.py"
DEFAULT_ENTRY = "main.py"
FAKE_MODEL_MODULE = "dojo_ai"
FAKE_MODEL_GLOBALS = frozenset({"fake_model", "respond", "for_each_seed"})
LESSON_TIMEOUT_SECONDS = 120


@dataclass(frozen=True)
class Challenge:
    id: str
    folder: Path
    entry: str
    tests: str

    def files(self, variant):
        """Project files of the `starter` or `solution` variant, keyed by their path inside the project."""
        folder = self.folder / variant
        if not folder.is_dir():
            return {self.entry: (self.folder / f"{variant}.py").read_text()}
        return {path.relative_to(folder).as_posix(): path.read_text() for path in sorted(folder.rglob("*")) if path.is_file()}

    def uses_fake_model(self):
        """True when the tests or the solution import `dojo_ai`, or `tests.py` reads the harness globals `fake_model`, `respond` or `for_each_seed`."""
        return self.imports(FAKE_MODEL_MODULE) or _reads_harness_globals(self.tests)

    def imports(self, module):
        sources = [self.tests, *self.files("solution").values()]
        return any(module in _imported_modules(source) for source in sources)


def _imported_modules(source):
    modules = set()
    for node in ast.walk(ast.parse(source)):
        if isinstance(node, ast.Import):
            modules.update(alias.name.split(".")[0] for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module and node.level == 0:
            modules.add(node.module.split(".")[0])
    return modules


def _reads_harness_globals(source):
    """True when a name of FAKE_MODEL_GLOBALS resolves to the harness global, not to a binding of `tests.py` (`respond = mod.respond`)."""
    module = symtable.symtable(source, "tests.py", "exec")
    bound_by_tests = {symbol.get_name() for symbol in module.get_symbols() if symbol.is_assigned() or symbol.is_imported()}

    def reads(table):
        for symbol in table.get_symbols():
            name = symbol.get_name()
            if name in FAKE_MODEL_GLOBALS and name not in bound_by_tests and symbol.is_referenced() and (table.get_type() == "module" or symbol.is_global()):
                return True
        return any(reads(child) for child in table.get_children())

    return reads(module)


def _strip_order(name):
    head, _, rest = name.partition("-")
    return rest if head.isdigit() and rest else name


def _lesson_id(folder):
    track = folder.relative_to(CONTENT).parts[0]
    lesson = folder if folder.name != "python" else folder.parent.parent
    return f"{track}/{_strip_order(lesson.name)}"


def find_challenges():
    """Every Python challenge: Python track lessons and the `variants/python` of multi-language lessons."""
    challenges = []
    python_tracks = {path.parent.name for path in CONTENT.glob("*/track.json") if json.loads(path.read_text()).get("engine") == "python"}
    lesson_tests = [path for track in sorted(python_tracks) for path in sorted((CONTENT / track).glob("*/*/tests.py"))]
    for tests in lesson_tests + sorted(CONTENT.glob("*/*/*/variants/python/tests.py")):
        folder = tests.parent
        lesson = folder if folder.name != "python" else folder.parent.parent
        if not (lesson / "meta.json").exists():
            continue
        meta = json.loads((lesson / "meta.json").read_text())
        entry = meta.get("entry", DEFAULT_ENTRY)
        if isinstance(entry, dict):
            entry = entry.get("python", DEFAULT_ENTRY)
        challenges.append(Challenge(_lesson_id(folder), folder, entry, tests.read_text()))
    return challenges


def listed_test_names(tests_source):
    """Names of the top-level `@test("...")` functions, in order, as the app lists them."""
    names = []
    for node in ast.parse(tests_source).body:
        if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue
        for decorator in node.decorator_list:
            if isinstance(decorator, ast.Call) and isinstance(decorator.func, ast.Name) and decorator.func.id == "test":
                names.append(decorator.args[0].value)
    return names


def grade(challenge, variant):
    """Harness result (`{"results": [...]}` or `{"compileError": ...}`) of one variant, graded in a fresh interpreter."""
    with tempfile.TemporaryDirectory(prefix="dojo-pytest-") as work:
        scratch = Path(work) / "scratch"
        scratch.mkdir()
        # Like Pyodide: hash seed 0. `-I` would ignore PYTHONHASHSEED, so the child runs with `-s -P` and an environment
        # without inherited PYTHON* variables instead.
        environment = {
            **{key: value for key, value in os.environ.items() if not key.startswith(("PYTHON", "DOJO_"))},
            "DOJO_APP_DIRECTORY": str(Path(work) / "app"),
            "DOJO_SCRATCH_DIRECTORIES": str(scratch),
            "TMPDIR": str(scratch),
            "HOME": str(scratch),
            "PYTHONHASHSEED": "0",
        }
        request = {"files": challenge.files(variant), "entry": challenge.entry, "tests": challenge.tests, "names": listed_test_names(challenge.tests)}
        output = Path(work) / "result.json"
        completed = subprocess.run(
            [sys.executable, "-s", "-P", str(RUNNER), str(output)],
            input=json.dumps(request),
            capture_output=True,
            text=True,
            env=environment,
            cwd=work,
            timeout=LESSON_TIMEOUT_SECONDS,
        )
        if completed.returncode != 0 or not output.exists():
            raise RuntimeError(f"{challenge.id} ({variant}) crashed the runner (exit {completed.returncode}):\n{completed.stderr[-4000:]}")
        return json.loads(output.read_text())
