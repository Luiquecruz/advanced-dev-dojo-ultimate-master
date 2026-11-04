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

## Coming from TypeScript and JavaScript

Node resolves a specifier to a file and caches the result in `require.cache`, keyed by filename. To fake a module, a common trick writes straight into that cache:

```ts
require.cache[require.resolve("./config")] = { exports: { level: "debug" } } as NodeModule;
```

The Python translation puts a module object into `sys.modules`:

```py
import sys, types

fake = types.ModuleType("shop")
exec(source, fake.__dict__)
sys.modules["shop"] = fake            # import shop now returns it
```

It works for one `import shop`, but the module has no `__spec__`: `importlib.reload(shop)` raises `ModuleNotFoundError: spec not found`, `from .orders import total` inside it fails with "no known parent package", nothing can import `shop.orders`, and the entry stays in `sys.modules` until someone deletes it. The import system expects a finder. Node's own equivalent is `module.registerHooks({ resolve, load })`: `resolve` is `find_spec`, `load` is the loader.

## How it works

- **The spec drives everything.** From `spec.name`, `spec.loader`, `spec.parent` and `spec.submodule_search_locations`, the machinery sets `__name__`, `__spec__`, `__package__` and, for packages, `__path__`. `spec_from_loader(name, loader, is_package=True)` marks a package.
- **Packages first.** `import shop.orders` imports `shop`, then calls `find_spec("shop.orders", shop.__path__)`. After loading, it binds `orders` as an attribute of `shop`.
- **Relative imports** resolve against the module's parent: `from .orders import total` in `shop.api` becomes `shop.orders`.
- **Cached before executed.** The module is placed in `sys.modules` before `exec_module` runs, so circular imports see the partially initialized module. If execution fails, the import system removes it again.
- **`importlib.reload(module)`** finds the spec again under the same name and calls `exec_module` on the **same** module object: globals the new code does not redefine survive, and objects that other modules imported with `from ... import` keep pointing at the old versions.
- **Order matters.** A finder inserted at position 0 shadows everything after it (pytest installs its assertion rewriting hook this way); appended, it is a fallback.
- **Executing source is running code.** A finder that loads source from a database or the network runs whatever is stored there with full privileges. Serve only trusted sources.

**Legacy:** finders used to implement `find_module()` and loaders `load_module()`. Python 3.12 removed `find_module()` support and the `imp` module; implement `find_spec()`, `create_module()` and `exec_module()`.

> **Status as of November 2026:** this track runs Python 3.14. Python 3.15 (October 2026) removed `Loader.load_module()`, which the import system no longer calls, and stopped setting `__cached__`; `__loader__` and `__package__` are deprecated and `__loader__` stops being set in 3.16, so read `__spec__.loader` and `__spec__.parent`. In Node, `module.registerHooks()` (synchronous, in-thread) is a release candidate and `module.register()` has been runtime-deprecated since v26.0.0.

## When to choose it

- **A meta path finder** to import code that is not a file on `sys.path`: generated modules, plugins stored elsewhere, source rewriting in test tools.
- **`importlib.import_module(name)`** to import by a name known only at runtime; **`importlib.util.spec_from_file_location`** to load one file by path.
- **`unittest.mock.patch.dict(sys.modules, {...})`** to replace a module inside a test: it restores `sys.modules` afterwards.
- **Normal packages and entry points** for everything else. An import hook changes what every later `import` means, for the whole process.
