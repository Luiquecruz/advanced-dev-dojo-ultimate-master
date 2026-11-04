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
        # TODO: a name is a package when another key starts with fullname + ".".
        return False

    def find_spec(
        self,
        fullname: str,
        path: Sequence[str] | None,
        target: ModuleType | None = None,
    ) -> importlib.machinery.ModuleSpec | None:
        # TODO: for a name this finder serves (a key, or a package of keys), return
        # importlib.util.spec_from_loader(fullname, self, is_package=...). Return None for any other name.
        return None

    def create_module(self, spec: importlib.machinery.ModuleSpec) -> ModuleType | None:
        return None

    def exec_module(self, module: ModuleType) -> None:
        # TODO: compile the current source of module.__spec__.name (an empty body for a package
        # without its own key) and execute it in module.__dict__.
        pass


def install(sources: Mapping[str, str]) -> DictFinder:
    """Put a finder for `sources` in front of every other finder and return it."""
    # TODO: insert the finder at the front of sys.meta_path.
    return DictFinder(sources)


def uninstall(finder: DictFinder) -> None:
    """Remove `finder` from sys.meta_path and forget every module it loaded."""
    # TODO: remove the finder from sys.meta_path, then delete from sys.modules every module
    # whose __spec__.loader is this finder.
