A plugin host keeps plugin source code in a database and must import it like any installed package. Write the import hook in `main.py`. The tests use module names starting with `dojo_virtual_`.

Treat that database as part of your code base: anyone who can write a row can run code in every process that imports it. Real plugin systems ship plugins as packages (wheels discovered through entry points, installed from a pinned, hashed lockfile) instead of executing stored source.

## `class DictFinder(sources)`

A meta path finder **and** loader for a dict that maps dotted module names to source code (`{"shop": "...", "shop.orders": "..."}`). It keeps a copy of the mapping in its `sources` attribute and reads it at execution time, so a source changed there is what `importlib.reload` runs.

- `is_package(fullname)`: `True` when another key starts with `fullname + "."`. A package without its own key gets an empty body.
- `find_spec(fullname, path, target=None)`: for a name it serves (a key or a package), return a spec built with `importlib.util.spec_from_loader(fullname, self, is_package=...)`; return `None` for every other name, so the next finder on `sys.meta_path` gets its turn. Never raise for an unknown name.
- `create_module(spec)` returns `None` (default module creation). Already written.
- `exec_module(module)`: compile the source of `module.__spec__.name` and execute it in `module.__dict__`.

With a correct spec, the import system sets `__name__`, `__spec__`, `__path__` on packages and the parent of each module, which makes relative imports (`from .orders import total`) work and binds a submodule as an attribute of its package.

## `install(sources)` and `uninstall(finder)`

- `install` first refuses names that would shadow the standard library: it raises `ValueError` naming the module when the top-level name of any key (the part before the first `.`) is in `sys.stdlib_module_names` or `sys.builtin_module_names`. `"secrets"` and `"hmac.extra"` (which would turn `hmac` into an implicit package) are both refused, and nothing is installed in that case.
- Otherwise `install` creates a `DictFinder`, inserts it at the **front** of `sys.meta_path` and returns it. Nothing is executed yet: modules run on their first import, once, and later imports come from `sys.modules`.
- `uninstall` removes the finder from `sys.meta_path` and deletes from `sys.modules` every module whose `__spec__.loader` is that finder. Importing one of them afterwards raises `ModuleNotFoundError`.

Do not create modules yourself and assign them to `sys.modules`: without a finder there is no spec, no relative import and no reload.
