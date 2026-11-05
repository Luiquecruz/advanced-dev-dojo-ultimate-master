"""Runs learner Python projects: grades `tests.py` one test at a time and executes programs for the Run button."""

import ast
import asyncio
import builtins
import decimal
import gc
import importlib
import inspect
import json
import logging
import os
import random
import shutil
import sys
import traceback
import types
import warnings

import _dojo_ai_bridge
from dojo_ai.testing import fake_model, for_each_seed, respond

# Pyodide gets an explicit environment without these, so it always uses /app, /tmp and ~. The CPython test suite
# (tests/python) points them at temporary directories: restore() deletes new entries in the scratch directories.
APP_DIRECTORY = os.environ.get("DOJO_APP_DIRECTORY", "/app")
TESTS_FILE = "tests.py"
TEST_TIMEOUT_SECONDS = 4
SCRATCH_DIRECTORIES = tuple(os.environ["DOJO_SCRATCH_DIRECTORIES"].split(os.pathsep)) if "DOJO_SCRATCH_DIRECTORIES" in os.environ else ("/tmp", os.path.expanduser("~"))
PRELOADED_MODULES = (
    "abc", "bisect", "collections", "contextlib", "copy", "dataclasses", "datetime", "decimal", "enum", "fractions",
    "functools", "heapq", "io", "itertools", "math", "operator", "pathlib", "re", "statistics", "string", "tempfile",
    "textwrap", "typing", "unicodedata", "weakref",
)
RESTORED_NAMESPACES = ("asyncio", "os", "time", "random", "json", "logging", "copyreg", "importlib", "inspect", "traceback", "types", "dojo_ai", "dojo_ai.testing", *PRELOADED_MODULES)
RESTORED_CLASSES = (
    ("json", "JSONEncoder"), ("json", "JSONDecoder"), ("logging", "Formatter"), ("logging", "Handler"), ("logging", "Logger"),
    ("logging", "LogRecord"), ("dataclasses", "Field"), ("decimal", "Context"),
)
RESTORED_TABLES = (("copy", "_deepcopy_dispatch"), ("copyreg", "dispatch_table"), ("copyreg", "_extension_registry"), ("copyreg", "_inverted_registry"))
UNAWAITED_MESSAGE = r"coroutine .* was never awaited"
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


_MISSING = object()


def _restore_namespace(namespace, saved):
    for key in [key for key in namespace if key not in saved]:
        del namespace[key]
    for key, value in saved.items():
        if namespace.get(key, _MISSING) is not value:
            namespace[key] = value


def _restore_class(cls, saved):
    for key in [key for key in cls.__dict__ if key not in saved]:
        try:
            delattr(cls, key)
        except (AttributeError, TypeError):
            pass
    for key, value in saved.items():
        if cls.__dict__.get(key, _MISSING) is not value:
            try:
                setattr(cls, key, value)
            except (AttributeError, TypeError):
                pass


def _is_extension(module):
    origin = getattr(getattr(module, "__spec__", None), "origin", None) or ""
    return origin.endswith(".so") or origin == "built-in"


def _logger_state(logger):
    return list(logger.handlers), list(logger.filters), logger.level, logger.propagate, logger.disabled


def _apply_logger_state(logger, state):
    handlers, filters, level, propagate, disabled = state
    logger.handlers[:] = handlers
    logger.filters[:] = filters
    logger.level = level
    logger.propagate = propagate
    logger.disabled = disabled


def _remove_path(path):
    if os.path.isdir(path) and not os.path.islink(path):
        shutil.rmtree(path, ignore_errors=True)
    else:
        try:
            os.remove(path)
        except OSError:
            pass


class InterpreterState:
    """Interpreter-wide state captured once, before any learner code runs, and put back after every test and program run."""

    def __init__(self):
        for name in PRELOADED_MODULES:
            importlib.import_module(name)
        if APP_DIRECTORY not in sys.path:
            sys.path.insert(0, APP_DIRECTORY)
        self.modules = dict(sys.modules)
        self.builtins = dict(builtins.__dict__)
        self.namespaces = {name: dict(sys.modules[name].__dict__) for name in RESTORED_NAMESPACES if name in sys.modules}
        self.classes = {cls: dict(cls.__dict__) for cls in (getattr(sys.modules[module], name) for module, name in RESTORED_CLASSES)}
        self.tables = {id(table): (table, dict(table)) for table in (getattr(sys.modules[module], name) for module, name in RESTORED_TABLES)}
        self.gc_enabled = gc.isenabled()
        self.path = list(sys.path)
        self.meta_path = list(sys.meta_path)
        self.path_hooks = list(sys.path_hooks)
        self.path_importer_cache = dict(sys.path_importer_cache)
        self.hooks = {name: getattr(sys, name) for name in ("stdout", "stderr", "stdin", "excepthook", "displayhook", "unraisablehook", "breakpointhook")}
        self.recursion_limit = sys.getrecursionlimit()
        self.int_max_str_digits = sys.get_int_max_str_digits()
        self.decimal_context = decimal.getcontext().copy()
        self.monitoring_tools = {tool for tool in range(6) if sys.monitoring.get_tool(tool) is not None}
        self.environ = dict(os.environ)
        self.cwd = os.getcwd()
        self.random_state = random.getstate()
        manager = logging.Logger.manager
        self.logger_names = set(manager.loggerDict)
        self.loggers = {name: _logger_state(logger) for name, logger in manager.loggerDict.items() if isinstance(logger, logging.Logger)}
        self.root_logger = _logger_state(logging.root)
        self.logging_disable = manager.disable
        self.scratch = {directory: set(os.listdir(directory)) for directory in SCRATCH_DIRECTORIES if os.path.isdir(directory)}

    def restore(self):
        sys.settrace(None)
        sys.setprofile(None)
        for tool in range(6):
            if tool not in self.monitoring_tools and sys.monitoring.get_tool(tool) is not None:
                try:
                    sys.monitoring.set_events(tool, 0)
                    sys.monitoring.free_tool_id(tool)
                except ValueError:
                    pass
        for name, value in self.hooks.items():
            setattr(sys, name, value)
        sys.setrecursionlimit(self.recursion_limit)
        sys.set_int_max_str_digits(self.int_max_str_digits)
        decimal.setcontext(self.decimal_context.copy())
        sys.path[:] = self.path
        sys.meta_path[:] = self.meta_path
        sys.path_hooks[:] = self.path_hooks
        _restore_namespace(sys.path_importer_cache, self.path_importer_cache)
        for name in [name for name, module in sys.modules.items() if name not in self.modules and not _is_extension(module)]:
            del sys.modules[name]
        for name, module in self.modules.items():
            if sys.modules.get(name, _MISSING) is not module:
                sys.modules[name] = module
        _restore_namespace(builtins.__dict__, self.builtins)
        for name, saved in self.namespaces.items():
            _restore_namespace(sys.modules[name].__dict__, saved)
        for cls, saved in self.classes.items():
            _restore_class(cls, saved)
        for table, saved in self.tables.values():
            _restore_namespace(table, saved)
        if self.gc_enabled:
            gc.enable()
        os.environ.clear()
        os.environ.update(self.environ)
        try:
            os.chdir(self.cwd)
        except OSError:
            os.makedirs(self.cwd, exist_ok=True)
            os.chdir(self.cwd)
        random.setstate(self.random_state)
        self._restore_logging()
        for directory, names in self.scratch.items():
            os.makedirs(directory, exist_ok=True)
            for name in set(os.listdir(directory)) - names:
                _remove_path(os.path.join(directory, name))

    def _restore_logging(self):
        manager = logging.Logger.manager
        for name in [name for name in manager.loggerDict if name not in self.logger_names]:
            del manager.loggerDict[name]
        for name, state in self.loggers.items():
            logger = manager.loggerDict.get(name)
            if isinstance(logger, logging.Logger):
                _apply_logger_state(logger, state)
        _apply_logger_state(logging.root, self.root_logger)
        manager.disable = self.logging_disable
        manager._clear_cache()


def unawaited_coroutines(caught):
    """Describes the `coroutine … was never awaited` warnings recorded while a test ran."""
    messages = []
    for warning in caught:
        if not (issubclass(warning.category, RuntimeWarning) and "was never awaited" in str(warning.message)):
            continue
        where = ""
        if warning.filename == TESTS_FILE:
            where = f"\n  at {TESTS_FILE}, line {warning.lineno}"
        elif warning.filename.startswith(f"{APP_DIRECTORY}/"):
            where = f"\n  at {os.path.relpath(warning.filename, APP_DIRECTORY)}, line {warning.lineno}"
        messages.append(f"RuntimeWarning: {warning.message}{where}")
    if not messages:
        return None
    return "\n".join([*messages, "Every coroutine must be awaited: tests that call async code are `async def` and use `await`."])


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
    for path in [path for path in sys.path_importer_cache if path == APP_DIRECTORY or path.startswith(f"{APP_DIRECTORY}/")]:
        del sys.path_importer_cache[path]


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


async def _run_test(files, entry, compiled_tests, tests_source, index, listed_name):
    _dojo_ai_bridge.reset()
    unload_project(files)
    session = _Session()
    registered = []
    tasks_before = asyncio.all_tasks()

    def test(name):
        def register(function):
            registered.append((name, function))
            return function

        return register

    name = listed_name
    try:
        with warnings.catch_warnings(record=True) as caught:
            warnings.filterwarnings("always", message=UNAWAITED_MESSAGE, category=RuntimeWarning)
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
                del outcome, scope, entry_module
                gc.collect()
            except BaseException as error:
                try:
                    message = describe_error(error, tests_source)
                except BaseException:
                    message = f"{type(error).__name__}: {error}"
                return {"name": name, "passed": False, "error": message}
        unawaited = unawaited_coroutines(caught)
        if unawaited:
            return {"name": name, "passed": False, "error": unawaited}
        return {"name": name, "passed": True}
    finally:
        session.close()
        for task in asyncio.all_tasks() - tasks_before:
            task.cancel()
        STATE.restore()


async def run_tests(files, entry, tests_source, test_names, start_index=0, on_event=None):
    """Runs each test against a fresh import of the learner project and returns `{name, passed, error}` dicts.

    `on_event`, when given, receives a JSON string before (`start`) and after (`result`) each test, so a host can stop a test that never returns.
    """
    files = files.to_py() if hasattr(files, "to_py") else files
    test_names = list(test_names)
    notify = (lambda payload: on_event(json.dumps(payload))) if on_event is not None else (lambda payload: None)
    problem = syntax_error(files)
    if problem:
        return {"results": [], "compileError": problem}
    try:
        compiled_tests = compile(tests_source, TESTS_FILE, "exec")
    except SyntaxError as error:
        return {"results": [], "compileError": f"Test file error: SyntaxError, line {error.lineno}: {error.msg}"}
    write_project(files)
    results = []
    try:
        for index in range(start_index, len(test_names)):
            notify({"type": "start", "index": index, "name": test_names[index]})
            result = await _run_test(files, entry, compiled_tests, tests_source, index, test_names[index])
            results.append(result)
            notify({"type": "result", "index": index, "result": result})
    finally:
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
        STATE.restore()


STATE = InterpreterState()
STATE.namespaces[__name__] = dict(globals())
