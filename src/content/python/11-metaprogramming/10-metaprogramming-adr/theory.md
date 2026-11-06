# Checkpoint: the Metaprogramming ADR

This module climbed the hook ladder: decorators, `__init_subclass__`, descriptors, `__getattr__`, metaclasses, `inspect`, finders on `sys.meta_path`, and the frames and bytecode underneath. Every rung answers **when** your code runs (at class creation, at attribute access, at import) and **whose** classes it touches. A plugin framework has to answer both questions for code written by people who will never read its source.

The checkpoint turns that into a decision: an **Architecture Decision Record** plus a **plan** whose numbers come from the briefing.

## Four mechanisms, four different jobs

| Mechanism | Runs when | Reaches | Breaks when |
| --- | --- | --- | --- |
| Class decorator `@register` | right after one class statement | only the classes someone decorated | an author forgets it; subclasses are not covered |
| `__init_subclass__` on the base | at every subclass creation, inherited | every subclass at any depth | almost never: it runs under any metaclass |
| Metaclass `RegistryMeta` | at class creation, can also control calls | every class built with it | a plugin class already has another metaclass: `TypeError: metaclass conflict` |
| Entry points (`importlib.metadata`) | when the host reads installed metadata | every installed distribution declaring the group | the code is not packaged; any installed distribution can join |

The first three are **registration** hooks: they run only when the module holding the class is imported. Entry points are **discovery**: the host learns names and import paths from packaging metadata without importing anything, then calls `EntryPoint.load()` for the one plugin it needs.

```py
from importlib.metadata import entry_points

exporters = entry_points(group="dx.exporters")    # metadata only, no plugin imported
sorted(exporters.names)                           # for --help
exporter = exporters["parquet"].load()            # imports one module; __init_subclass__ validates it
exporters["parquet"].dist.name                    # the distribution that declared it
```

A distribution declares it in its `pyproject.toml`:

```toml
[project.entry-points."dx.exporters"]
parquet = "acme_dx.parquet:ParquetExporter"
```

## The decision checklist

1. **Where does plugin code live?** Inside your repository, a package scan or an explicit list works. Code from other repositories, released on other schedules, reaches you only through packaging metadata.
2. **What does importing everything cost?** Modules × measured import time, against the startup budget left after the core. Over budget means lazy loading, and lazy loading means the host must learn plugin names without importing plugin modules.
3. **When must mistakes surface?** Validation at class creation fails in CI the moment a module is imported; validation at first use fails in production, on the first command that needs the plugin.
4. **Who writes the subclasses, and what else do they inherit?** A hook that runs automatically for subclasses of subclasses protects authors who never read the docs; a metaclass collides with any other metaclass in their bases.
5. **Who may register?** Discovery through installed metadata is code execution for every distribution that declares the group: decide which distributions are trusted.

## Coherence is the point

An eager package scan over 50 modules at 5 ms each spends 250 ms before the first line of output. A metaclass registry breaks the first plugin that also inherits from a validation library's model. A decorator registry silently skips the subclass whose author forgot the decorator. The tests check these relationships, and the counts and costs are numbers you compute.

```py
modules, import_ms = 50, 5
eager_import_ms = modules * import_ms           # 250 ms to import every plugin
budget_ms = 200 - 120                           # 80 ms left after the core
lazy_import_ms = 9 + import_ms                  # metadata scan plus the one plugin a command uses: 14 ms
concrete = 40 - 4 + 10                          # abstract bases never register: 46 classes
```

This track runs CPython 3.14. Python 3.15 adds explicit lazy imports (PEP 810: `lazy import`, `-X lazy_imports`), which defer loading a module until one of its names is used. They do not replace discovery: a registry filled by `__init_subclass__` stays empty until the plugin module really loads, so the host still needs plugin names from metadata.
