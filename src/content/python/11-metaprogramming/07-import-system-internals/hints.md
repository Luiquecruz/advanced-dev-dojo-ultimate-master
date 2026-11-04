The import system does the hard parts once your finder answers one question: "do you serve this name, and how do I load it?". `find_spec` returns `None` for names it does not know and a `ModuleSpec` for names it does; `importlib.util.spec_from_loader(fullname, self, is_package=...)` builds that spec with the finder as its own loader.
---
`is_package=True` gives the spec `submodule_search_locations`, which becomes the package's `__path__`. Without it, `import shop.orders` fails because `shop` is not a package, and `from .orders import total` has no parent to resolve against.
---
In `exec_module`, read `self.sources.get(module.__spec__.name, "")` at that moment (not in `__init__`), then `exec(compile(source, f"<dict:{name}>", "exec"), module.__dict__)`. In `uninstall`, iterate over `list(sys.modules.items())` and compare `module.__spec__.loader is finder`, skipping modules whose `__spec__` is `None`.
