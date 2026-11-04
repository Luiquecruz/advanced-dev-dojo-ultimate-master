import importlib
import sys

PREFIX = "dojo_virtual_"
SOURCES = {
    "dojo_virtual_greet": "def hello(name):\n    return f'hello {name}'\n",
    "dojo_virtual_shop": "from .orders import total\n",
    "dojo_virtual_shop.orders": "def total(prices):\n    return sum(prices)\n",
    "dojo_virtual_shop.api": (
        "from . import orders\n"
        "from .orders import total\n"
        "\n"
        "def checkout(prices):\n"
        "    return {'total': total(prices), 'module': orders.__name__}\n"
    ),
}
COUNTING = "loads = globals().get('loads', 0) + 1\n"


def cleanup(saved_meta_path):
    sys.meta_path[:] = saved_meta_path
    for name in [name for name in sys.modules if name.startswith(PREFIX)]:
        del sys.modules[name]


@test("an installed finder imports a module and a package submodule with matching names and specs")
def _():
    saved = list(sys.meta_path)
    try:
        mod.install(SOURCES)
        greet = importlib.import_module("dojo_virtual_greet")
        orders = importlib.import_module("dojo_virtual_shop.orders")
        shop = sys.modules.get("dojo_virtual_shop")
        greeting = greet.hello("ada")
        names = [greet.__name__, greet.__spec__.name, orders.__name__, orders.__spec__.name]
        parent = orders.__spec__.parent
        package_path = getattr(shop, "__path__", None)
        bound_submodule = getattr(shop, "orders", None)
    finally:
        cleanup(saved)
    assert greeting == "hello ada"
    assert names == ["dojo_virtual_greet", "dojo_virtual_greet", "dojo_virtual_shop.orders", "dojo_virtual_shop.orders"]
    assert parent == "dojo_virtual_shop"
    assert package_path is not None
    assert bound_submodule is orders


@test("nothing runs at install time, and a second import returns the module cached in sys.modules")
def _():
    saved = list(sys.meta_path)
    try:
        mod.install({"dojo_virtual_counter": COUNTING})
        loaded_early = "dojo_virtual_counter" in sys.modules
        first = importlib.import_module("dojo_virtual_counter")
        second = importlib.import_module("dojo_virtual_counter")
        cached = sys.modules.get("dojo_virtual_counter")
        loads = first.loads
    finally:
        cleanup(saved)
    assert not loaded_early
    assert second is first
    assert cached is first
    assert loads == 1


@test("relative imports resolve inside a served package")
def _():
    saved = list(sys.meta_path)
    try:
        mod.install(SOURCES)
        api = importlib.import_module("dojo_virtual_shop.api")
        result = api.checkout([3, 4])
        package_total = sys.modules["dojo_virtual_shop"].total([1, 2])
    finally:
        cleanup(saved)
    assert result == {"total": 7, "module": "dojo_virtual_shop.orders"}
    assert package_total == 3


@test("reload executes the current source again in the same module object")
def _():
    saved = list(sys.meta_path)
    try:
        finder = mod.install({"dojo_virtual_config": "LEVEL = 'info'\n" + COUNTING})
        config = importlib.import_module("dojo_virtual_config")
        finder.sources["dojo_virtual_config"] = "LEVEL = 'debug'\n" + COUNTING
        reloaded = importlib.reload(config)
        level = config.LEVEL
        loads = config.loads
    finally:
        cleanup(saved)
    assert reloaded is config
    assert level == "debug"
    assert loads == 2


@test("install refuses names that would shadow the standard library")
async def _():
    saved = list(sys.meta_path)
    try:
        plain = await capture_error(lambda: mod.install({"secrets": "TOKEN = 'forged'\n"}))
        dotted = await capture_error(lambda: mod.install({"hmac.extra": ""}))
        mixed = await capture_error(lambda: mod.install({"dojo_virtual_ok": "", "json": "X = 1\n"}))
        unchanged = sys.meta_path == saved
    finally:
        cleanup(saved)
    kinds = [type(error).__name__ for error in (plain, dotted, mixed)]
    assert kinds == ["ValueError", "ValueError", "ValueError"]
    assert "secrets" in str(plain)
    assert "hmac" in str(dotted)
    assert "json" in str(mixed)
    assert unchanged


@test("names the finder does not serve fall through, and uninstall removes the finder and its modules")
async def _():
    saved = list(sys.meta_path)
    try:
        finder = mod.install(SOURCES)
        missing = await capture_error(lambda: importlib.import_module("dojo_virtual_missing"))
        stdlib_module = importlib.import_module("colorsys").__name__
        importlib.import_module("dojo_virtual_greet")
        importlib.import_module("dojo_virtual_shop.orders")
        mod.uninstall(finder)
        still_installed = finder in sys.meta_path
        leftovers = sorted(name for name in sys.modules if name.startswith(PREFIX))
        after = await capture_error(lambda: importlib.import_module("dojo_virtual_greet"))
    finally:
        cleanup(saved)
    assert type(missing).__name__ == "ModuleNotFoundError"
    assert stdlib_module == "colorsys"
    assert not still_installed
    assert leftovers == []
    assert type(after).__name__ == "ModuleNotFoundError"
