import importlib.abc
import importlib.machinery
import importlib.util
import sys
from collections.abc import Mapping, Sequence
from types import ModuleType


class DictFinder(importlib.abc.MetaPathFinder, importlib.abc.Loader):
    """Finds and loads modules whose source code lives in a dict of dotted name -> source."""

    def __init__(self, sources: Mapping[str, str]) -> None:
        self.sources = dict(sources)

    def is_package(self, fullname: str) -> bool:
        prefix = f"{fullname}."
        return any(name.startswith(prefix) for name in self.sources)

    def find_spec(
        self,
        fullname: str,
        path: Sequence[str] | None,
        target: ModuleType | None = None,
    ) -> importlib.machinery.ModuleSpec | None:
        package = self.is_package(fullname)
        if fullname not in self.sources and not package:
            return None
        return importlib.util.spec_from_loader(fullname, self, origin=f"dict:{fullname}", is_package=package)

    def create_module(self, spec: importlib.machinery.ModuleSpec) -> ModuleType | None:
        return None

    def exec_module(self, module: ModuleType) -> None:
        name = module.__spec__.name
        code = compile(self.sources.get(name, ""), f"<dict:{name}>", "exec")
        exec(code, module.__dict__)


def install(sources: Mapping[str, str]) -> DictFinder:
    """Put a finder for `sources` in front of every other finder and return it."""
    finder = DictFinder(sources)
    sys.meta_path.insert(0, finder)
    return finder


def uninstall(finder: DictFinder) -> None:
    """Remove `finder` from sys.meta_path and forget every module it loaded."""
    if finder in sys.meta_path:
        sys.meta_path.remove(finder)
    for name, module in list(sys.modules.items()):
        spec = getattr(module, "__spec__", None)
        if spec is not None and spec.loader is finder:
            del sys.modules[name]
