`__init_subclass__` is a hook on a base class that Python calls **every time a subclass is created**, with the new subclass as `cls`. Keywords written in the class header are passed to it, which makes it the standard way to build a registry or to validate subclasses at definition time.

```py
class Plugin:
    registry = {}

    def __init_subclass__(cls, name=None, **kwargs):
        super().__init_subclass__(**kwargs)
        Plugin.registry[name or cls.__name__] = cls

class CsvExport(Plugin, name="csv"):
    pass

Plugin.registry          # {'csv': <class 'CsvExport'>}, and no instance was created
```

The hook runs for subclasses at any depth, but not for the class that defines it: `Plugin` never registers itself.

## Coming from TypeScript and JavaScript

JavaScript has no hook that runs when a class is extended. Registries are filled by a decorator on each class, which a subclass does not inherit, or from the constructor, which only runs when someone creates an instance:

```ts
const registry = new Map<string, typeof Plugin>();
class Plugin {
  constructor() { registry.set(this.constructor.name, this.constructor as typeof Plugin); }
}
class CsvExport extends Plugin {}
registry.get("CsvExport");   // undefined until something runs `new CsvExport()`
```

Translated literally, the registry stays empty exactly when it is needed, at startup, when the application reads `"csv"` from its configuration and looks for the class:

```py
class Plugin:
    registry = {}

    def __init__(self):
        Plugin.registry[type(self).__name__] = type(self)   # too late: needs an instance first

Plugin.registry.get("CsvExport")   # None
```

Register in `__init_subclass__`, which runs when the class statement runs.

## How it works

`type.__new__` builds the class, calls `__set_name__` on its descriptors, then calls `__init_subclass__` on the parent (the next class in the new class's MRO). It is an implicit classmethod, so no decorator is needed.

**Class keywords.** In `class Csv(Plugin, name="csv")`, every keyword except `metaclass` is passed to `__init_subclass__`. `object.__init_subclass__` accepts none, so each class takes its own keywords and forwards the rest:

```py
class Tagged:
    def __init_subclass__(cls, tags=(), **kwargs):
        super().__init_subclass__(**kwargs)
        cls.tags = tuple(tags)

class Csv(Plugin, Tagged, name="csv", tags=["text"]):   # MRO: Csv, Plugin, Tagged, object
    pass
```

If `Plugin` calls `super().__init_subclass__()` without `**kwargs`, `Tagged` silently gets the default. Keywords are **not inherited**: `abstract=True` on a base says nothing about its subclasses.

**Validation at definition time.** Raising inside `__init_subclass__` makes the class statement fail, so the name is never bound and the error points at the class line, not at a later call. Duplicate names, a missing required attribute or a wrong attribute type are all caught at import.

**Where the registry lives.** `Plugin.registry` is one dict for the hierarchy. `cls.registry` would find the same dict through the MRO, but writing `Plugin.registry[...]` states the intent. A family that needs its own registry assigns `registry = {}` in its own body.

**Import time.** A plugin registers when its module is imported. A module nobody imports registers nothing, so frameworks import plugin packages explicitly or read installed plugins from `importlib.metadata.entry_points()`.

**Legacy.** Before Python 3.6 ([PEP 487](https://peps.python.org/pep-0487/)) this required a metaclass. A metaclass registry still works, but it conflicts with any other metaclass in the bases: `class Exporter(Plugin, abc.ABC)` fails with `TypeError: metaclass conflict` when `Plugin` uses its own metaclass and `abc.ABC` uses `ABCMeta`. `__init_subclass__` has no such cost.

`__class_getitem__` is the other class-level hook, from [PEP 560](https://peps.python.org/pep-0560/): `Plugin[int]` calls it. The data model reference discourages using it for anything except type hints, so `Plugin["csv"]` is not a registry lookup API.

## When to choose it

- **`__init_subclass__`** for registries, required class attributes and per-subclass setup that must apply to every subclass automatically.
- **A class decorator** (`@register("csv")`) when only some classes opt in, or when the classes do not share a base.
- **A metaclass** only when you must change how the class is called or prepared (lesson 05), never just to register subclasses.
- **Entry points** when plugins live in other installed packages that your code should not import by name.
