"""Runs learner Python projects: grades `tests.py` one test at a time and executes programs for the Run button."""

import ast
import asyncio
import importlib
import inspect
import os
import shutil
import sys
import traceback
import types

import _dojo_ai_bridge
from dojo_ai.testing import fake_model, for_each_seed, respond

APP_DIRECTORY = "/app"
TESTS_FILE = "tests.py"
TEST_TIMEOUT_SECONDS = 4
SAFE_CALLS = {"len", "sorted", "list", "tuple", "set", "dict", "str", "int", "float", "round", "abs", "min", "max", "sum", "any", "all", "type", "repr", "bool"}
UNSAFE_NODES = (ast.Await, ast.NamedExpr, ast.Lambda, ast.Yield, ast.YieldFrom)


class approx:
    """Compares numbers within a tolerance, like `pytest.approx`: `assert cost == approx(0.0012, abs=1e-6)`."""

    def __init__(self, expected, rel=1e-6, abs=1e-12):
        self.expected = expected
        self.rel = rel
        self.abs = abs

    def __eq__(self, actual):
        return isinstance(actual, (int, float)) and abs(actual - self.expected) <= max(self.rel * abs(self.expected), self.abs)

    def __repr__(self):
        return f"approx({self.expected!r})"


async def capture_error(action):
    """Awaits a coroutine (or calls a function) that must fail and returns the exception it raised."""
    try:
        outcome = action() if callable(action) else action
        if inspect.isawaitable(outcome):
            await outcome
    except Exception as error:
        return error
    raise AssertionError("Expected an error, but nothing was raised.")


class _OutputCapture:
    def __init__(self, target, lines):
        self._target = target
        self._lines = lines
        self._pending = ""

    def write(self, text):
        self._target.write(text)
        self._pending += text
        *complete, self._pending = self._pending.split("\n")
        self._lines.extend(complete)
        return len(text)

    def flush(self):
        self._target.flush()


class _Session:
    """State of one test: captured output and the stdout to restore."""

    def __init__(self):
        self.original_stdout = sys.stdout

    def capture_output(self):
        """Collects every printed line until the test ends."""
        lines = []
        sys.stdout = _OutputCapture(sys.stdout, lines)
        return lines

    def close(self):
        sys.stdout = self.original_stdout


def module_name(file_name):
    path = file_name[:-3] if file_name.endswith(".py") else file_name
    parts = path.split("/")
    if parts[-1] == "__init__":
        parts = parts[:-1]
    return ".".join(parts)


def write_project(files):
    shutil.rmtree(APP_DIRECTORY, ignore_errors=True)
    for name, code in files.items():
        path = os.path.join(APP_DIRECTORY, name)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w") as file:
            file.write(code)
    if APP_DIRECTORY not in sys.path:
        sys.path.insert(0, APP_DIRECTORY)


def unload_project(files):
    names = {module_name(name) for name in files if name.endswith(".py")}
    for loaded in list(sys.modules):
        if loaded in names or any(loaded.startswith(f"{name}.") for name in names):
            del sys.modules[loaded]
    importlib.invalidate_caches()


def syntax_error(files):
    for name, code in files.items():
        if not name.endswith(".py"):
            continue
        try:
            compile(code, os.path.join(APP_DIRECTORY, name), "exec")
        except SyntaxError as error:
            return f"SyntaxError in {name}, line {error.lineno}: {error.msg}"
    return None


class LazyModules(dict):
    """Learner modules by file name (`modules["orders.py"]`), imported on first access."""

    def __missing__(self, file_name):
        module = importlib.import_module(module_name(file_name))
        self[file_name] = module
        return module


def is_safe(node):
    for child in ast.walk(node):
        if isinstance(child, UNSAFE_NODES):
            return False
        if isinstance(child, ast.Call) and not (isinstance(child.func, ast.Name) and child.func.id in SAFE_CALLS):
            return False
    return True


def shorten(value):
    text = repr(value)
    return text if len(text) <= 300 else f"{text[:300]}…"


def describe_assertion(error, tests_source):
    frames = [frame for frame in traceback.extract_tb(error.__traceback__) if frame.filename == TESTS_FILE]
    tb = error.__traceback__
    frame_object = None
    while tb is not None:
        if tb.tb_frame.f_code.co_filename == TESTS_FILE:
            frame_object = tb.tb_frame
        tb = tb.tb_next
    if not frames or frame_object is None:
        return f"AssertionError: {error}" if str(error) else "AssertionError"
    line = frames[-1].lineno
    statement = next(
        (node for node in ast.walk(ast.parse(tests_source)) if isinstance(node, ast.Assert) and node.lineno <= line <= node.end_lineno),
        None,
    )
    if statement is None:
        return f"AssertionError: {error}" if str(error) else f"AssertionError at {TESTS_FILE}, line {line}"
    lines = [ast.get_source_segment(tests_source, statement) or f"assert at line {line}"]
    if statement.msg is not None and str(error):
        lines.append(str(error))
    test = statement.test
    evaluate = lambda node: eval(compile(ast.Expression(node), TESTS_FILE, "eval"), frame_object.f_globals, frame_object.f_locals)
    try:
        if isinstance(test, ast.Compare) and len(test.comparators) == 1 and is_safe(test):
            lines.append(f"  left:  {shorten(evaluate(test.left))}")
            lines.append(f"  right: {shorten(evaluate(test.comparators[0]))}")
        elif isinstance(test, ast.UnaryOp) and isinstance(test.op, ast.Not) and is_safe(test.operand):
            lines.append(f"  value: {shorten(evaluate(test.operand))}")
        elif not isinstance(test, ast.Constant) and is_safe(test):
            lines.append(f"  value: {shorten(evaluate(test))}")
    except Exception:
        pass
    return "\n".join(lines)


def describe_error(error, tests_source):
    if isinstance(error, AssertionError):
        message = describe_assertion(error, tests_source)
    else:
        message = f"{type(error).__name__}: {error}" if str(error) else type(error).__name__
        frames = traceback.extract_tb(error.__traceback__)
        learner_frames = [frame for frame in frames if frame.filename.startswith(f"{APP_DIRECTORY}/")]
        test_frames = [frame for frame in frames if frame.filename == TESTS_FILE]
        if learner_frames:
            frame = learner_frames[-1]
            message += f"\n  at {os.path.relpath(frame.filename, APP_DIRECTORY)}, line {frame.lineno}: {frame.line}"
        elif test_frames:
            frame = test_frames[-1]
            source_line = tests_source.splitlines()[frame.lineno - 1].strip()
            message += f"\n  at {TESTS_FILE}, line {frame.lineno}: {source_line}"
    notes = getattr(error, "__notes__", [])
    return "\n".join([*notes, message]) if notes else message


async def run_tests(files, entry, tests_source, test_names):
    """Runs each test against a fresh import of the learner project and returns `{name, passed, error}` dicts."""
    files = files.to_py() if hasattr(files, "to_py") else files
    test_names = list(test_names)
    problem = syntax_error(files)
    if problem:
        return {"results": [], "compileError": problem}
    try:
        compiled_tests = compile(tests_source, TESTS_FILE, "exec")
    except SyntaxError as error:
        return {"results": [], "compileError": f"Test file error: SyntaxError, line {error.lineno}: {error.msg}"}
    write_project(files)
    results = []
    for index, listed_name in enumerate(test_names):
        _dojo_ai_bridge.reset()
        unload_project(files)
        session = _Session()
        registered = []

        def test(name):
            def register(function):
                registered.append((name, function))
                return function

            return register

        name = listed_name
        try:
            entry_module = importlib.import_module(module_name(entry))
            scope = {
                "__name__": "tests",
                "test": test,
                "mod": entry_module,
                "modules": LazyModules({entry: entry_module}),
                "source": files[entry],
                "sources": dict(files),
                "capture_error": capture_error,
                "capture_output": session.capture_output,
                "approx": approx,
                "fake_model": fake_model,
                "respond": respond,
                "for_each_seed": for_each_seed,
            }
            exec(compiled_tests, scope)
            if index >= len(registered):
                raise RuntimeError("Test was not registered. Keep @test functions at the top level of tests.py.")
            name, function = registered[index]
            outcome = function()
            if inspect.isawaitable(outcome):
                try:
                    await asyncio.wait_for(outcome, TEST_TIMEOUT_SECONDS)
                except TimeoutError:
                    raise TimeoutError(f'Test "{name}" timed out after {TEST_TIMEOUT_SECONDS * 1000}ms.') from None
            results.append({"name": name, "passed": True})
        except BaseException as error:
            results.append({"name": name, "passed": False, "error": describe_error(error, tests_source)})
        finally:
            session.close()
    _dojo_ai_bridge.reset()
    return {"results": results}


async def run_program(files, entry):
    """Executes the entry file as `__main__`, waits for the coroutines it passes to `asyncio.run`, and returns the exit code."""
    files = files.to_py() if hasattr(files, "to_py") else files
    _dojo_ai_bridge.reset()
    problem = syntax_error(files)
    if problem:
        print(problem, file=sys.stderr)
        return 1
    write_project(files)
    unload_project(files)
    scheduled = []
    original_run = asyncio.run

    def run(main, *, debug=None, loop_factory=None):
        scheduled.append(asyncio.ensure_future(main))

    asyncio.run = run
    path = os.path.join(APP_DIRECTORY, entry)
    module = types.ModuleType("__main__")
    module.__file__ = path
    try:
        exec(compile(files[entry], path, "exec"), module.__dict__)
        for task in scheduled:
            await task
        return 0
    except SystemExit as exit:
        return exit.code if isinstance(exit.code, int) else (0 if exit.code is None else 1)
    except BaseException as error:
        learner_frames = [frame for frame in traceback.extract_tb(error.__traceback__) if frame.filename.startswith(f"{APP_DIRECTORY}/")]
        trace = "".join(traceback.format_list(learner_frames)).replace(f"{APP_DIRECTORY}/", "")
        print(f"Traceback (most recent call last):\n{trace}{type(error).__name__}: {error}", file=sys.stderr)
        return 1
    finally:
        asyncio.run = original_run
        _dojo_ai_bridge.reset()
