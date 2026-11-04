import importlib
import sys

from main import install, uninstall

sources = {
    "dojo_virtual_plugins": "LOADED = []\n",
    "dojo_virtual_plugins.csv_export": (
        "from . import LOADED\n"
        "LOADED.append(__name__)\n"
        "SEPARATOR = ','\n"
        "def export(row):\n"
        "    return SEPARATOR.join(row)\n"
    ),
}

finder = install(sources)
try:
    csv_export = importlib.import_module("dojo_virtual_plugins.csv_export")
    print("imported:", csv_export.__name__, "| package:", csv_export.__spec__.parent)
    print("export:", csv_export.export(["sku", "qty"]))
    print("same object on the next import:", importlib.import_module("dojo_virtual_plugins.csv_export") is csv_export)

    finder.sources["dojo_virtual_plugins.csv_export"] = sources["dojo_virtual_plugins.csv_export"].replace("','", "';'")
    importlib.reload(csv_export)
    print("after reload:", csv_export.export(["sku", "qty"]))
    print("LOADED after import and reload:", sys.modules["dojo_virtual_plugins"].LOADED)
finally:
    uninstall(finder)

print("still cached after uninstall:", "dojo_virtual_plugins" in sys.modules)
try:
    importlib.import_module("dojo_virtual_plugins")
except ModuleNotFoundError as error:
    print("rejected:", error)
