`import shop.orders` is a protocol, not a file lookup. Python checks the `sys.modules` cache, imports the parent `shop` first, then asks each **finder** on `sys.meta_path` for a **spec**. The first spec that comes back names a **loader**, which creates the module and executes its code:

```py
import importlib.abc, importlib.util, sys

class Inline(importlib.abc.MetaPathFinder, importlib.abc.Loader):
    def find_spec(self, fullname, path, target=None):
        if fullname != "build_info":
            return None                                   # not mine: the next finder tries
        return importlib.util.spec_from_loader(fullname, self)

    def create_module(self, spec):
        return None                                       # default module object

    def exec_module(self, module):
        exec("VERSION = '1.4.2'", module.__dict__)

sys.meta_path.insert(0, Inline())
import build_info
build_info.VERSION                    # '1.4.2'
build_info.__spec__.loader            # the Inline instance
```

CPython starts with three finders on `sys.meta_path`: built-in modules, frozen modules, and `PathFinder`, which searches `sys.path` for files. Every import of a file goes through the same protocol.

## How it works

- **The spec drives everything.** From `spec.name`, `spec.loader`, `spec.parent` and `spec.submodule_search_locations`, the machinery sets `__name__`, `__spec__`, `__package__` and, for packages, `__path__`. `spec_from_loader(name, loader, is_package=True)` marks a package.
- **Packages first.** `import shop.orders` imports `shop`, then calls `find_spec("shop.orders", shop.__path__)`. After loading, it binds `orders` as an attribute of `shop`.
- **Relative imports** resolve against the module's parent: `from .orders import total` in `shop.api` becomes `shop.orders`.
- **Cached before executed.** The module is placed in `sys.modules` before `exec_module` runs, so circular imports see the partially initialized module. If execution fails, the import system removes it again.
- **`importlib.reload(module)`** finds the spec again under the same name and calls `exec_module` on the **same** module object: globals the new code does not redefine survive, and objects that other modules imported with `from ... import` keep pointing at the old versions.
- **Order matters.** A finder inserted at position 0 shadows everything after it (pytest installs its assertion rewriting hook this way); appended, it is a fallback.
- **`find_spec` returns `None` for names it does not serve.** The import system asks each finder in order and moves on only on `None`; an exception aborts the whole import, so a finder at position 0 that looks names up with `self.sources[fullname]` breaks every new import, the standard library included.
- **A module pushed into `sys.modules` by hand is not imported.** `sys.modules["shop"] = fake` makes one `import shop` return it, but the module has no `__spec__`: `importlib.reload(shop)` raises `ModuleNotFoundError: spec not found`, `from .orders import total` inside it fails with "no known parent package", nothing can import `shop.orders`, and the entry stays until someone deletes it. The import system expects a finder.

**Legacy:** finders used to implement `find_module()` and loaders `load_module()`. Python 3.12 removed `find_module()` support and the `imp` module; implement `find_spec()`, `create_module()` and `exec_module()`.

This track runs Python 3.14. Python 3.15 removes `Loader.load_module()`, which the import system no longer calls, and stops setting `__cached__`; `__loader__` and `__package__` are deprecated and `__loader__` stops being set in 3.16, so read `__spec__.loader` and `__spec__.parent`.

## Common mistakes

**Removing the finder but keeping its modules.** A module runs once per process: after the first import it lives in `sys.modules`, and every later `import` returns that cached object without asking any finder. Taking the finder off `sys.meta_path` therefore changes nothing for modules it already loaded:

```py
# wrong: the finder is gone, but the module it loaded is still cached
sys.meta_path.remove(finder)
"plugins" in sys.modules        # True, so `import plugins` still succeeds

# right: also forget what it loaded
del sys.modules["plugins"]
"plugins" in sys.modules        # False, so `import plugins` asks the finders again
```

A finder may have loaded more than one module, so the full fix deletes from `sys.modules` every entry whose `__spec__.loader` is that finder. Loop over a `list(...)` copy of `sys.modules.items()`, because deleting keys from a dict while iterating over it raises `RuntimeError`.

The same cache explains the other surprise: importing a module a second time does not run its code again; `importlib.reload` does.

## Security note

An import hook decides what code runs when any part of the process writes `import x`. Three consequences:

- **It executes with full privileges.** `exec_module` runs the source as ordinary Python: it can open files, read environment variables and open sockets. Removing `__builtins__` or passing a restricted globals dict is not a sandbox; there is no safe way to run untrusted Python in-process. Serve only source you would commit to your repository, never user input, request data or rows that others can edit.
- **A finder at the front shadows everything.** At position 0 of `sys.meta_path` it answers before the standard library and installed packages, for every module not yet in `sys.modules`. A served name like `json` or `ssl`, or a dotted key that turns `ssl` into an implicit package, replaces the real module for the whole process. This is the same failure as dependency confusion (a public package that shadows an internal name) and as a stray `json.py` next to your script. Namespace your names, refuse standard library names, and append the finder when it only needs to be a fallback.
- **Clean up.** Remove the finder and the modules it loaded when you are done (`uninstall`, or a context manager), so later imports in the same process are not answered by code that is no longer meant to run.

## When to choose it

- **A meta path finder** to import code that is not a file on `sys.path`: generated modules, plugins stored elsewhere, source rewriting in test tools.
- **`importlib.import_module(name)`** to import by a name known only at runtime.
- **`importlib.resources.files(package)`** to read data files shipped inside a package (data, never code to `exec`); **`spec_from_file_location`** only for paths your program controls, never for a path taken from user input.
- **`unittest.mock.patch.dict(sys.modules, {...})`** to replace a module inside a test: it restores `sys.modules` afterwards.
- **Normal packages and entry points** for everything else. An import hook changes what every later `import` means, for the whole process.
