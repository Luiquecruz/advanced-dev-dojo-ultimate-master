import ast
import importlib
import sys


def guards_main(text):
    for node in ast.walk(ast.parse(text)):
        if isinstance(node, ast.If) and isinstance(node.test, ast.Compare):
            names = [part.id for part in [node.test.left, *node.test.comparators] if isinstance(part, ast.Name)]
            values = [part.value for part in node.test.comparators if isinstance(part, ast.Constant)]
            if "__name__" in names and "__main__" in values:
                return True
    return False


def imported_modules(text):
    found = set()
    for node in ast.walk(ast.parse(text)):
        if isinstance(node, ast.Import):
            found.update(alias.name for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module:
            found.add(node.module)
    return found


@test("current_level sees a level changed through config.set_level")
def _():
    config = modules["config.py"]
    before = mod.current_level()
    config.set_level("debug")
    after = mod.current_level()
    assert before == "info"
    assert after == "debug"


@test("handlers lists the registered handler names in definition order")
def _():
    names = mod.handlers()
    assert names == ["ping", "health"]


@test("importing the registry again reuses the cached module and registers nothing twice")
def _():
    first = importlib.import_module("registry")
    again = importlib.import_module("registry")
    cached = sys.modules["registry"]
    assert first is again
    assert again is cached
    names = mod.handlers()
    assert names == ["ping", "health"]


@test("the script block is guarded and does not run on import")
def _():
    ran = mod.RAN_AS_SCRIPT
    assert ran is False
    assert guards_main(source)


@test("registry imports on its own without a circular import")
def _():
    for name in ("main", "registry", "config"):
        sys.modules.pop(name, None)
    error = None
    try:
        registry = importlib.import_module("registry")
    except ImportError as caught:
        error = caught
    assert error is None
    imports = imported_modules(sources["registry.py"])
    assert "main" not in imports
    count = len(registry.HANDLERS)
    assert count == 2
