Build the base class of an export plugin system in `main.py`. A plugin registers itself when its class statement runs, so the application can pick a class by the name written in its configuration (`Plugin.registry[config["format"]]`) before any instance exists.

## `class Plugin`

`Plugin.registry` is one dict, shared by the whole hierarchy, that maps a plugin name to its class. `Plugin` itself is never in it.

Implement `__init_subclass__(cls, name=None, abstract=False, **kwargs)` so that, for every subclass at any depth:

- `abstract=True` keeps **that class** out of the registry. Its subclasses register normally unless they also pass `abstract=True`.
- The plugin name is `name` when given, otherwise the class's own `__name__`. A subclass of a named plugin never inherits its parent's name: `class Tsv(Csv)` registers as `"Tsv"`.
- The name is stored on the class as `plugin_name`, and the class is stored in `Plugin.registry` under it.
- A name that is already registered raises `ValueError` whose message contains the name. The first class stays registered.
- Every other class keyword is forwarded with `super().__init_subclass__(**kwargs)`, so a mixin later in the MRO receives its own keywords (`class CsvExport(Plugin, Tagged, name="csv", tags=[...])`).

Plugins must also combine with `abc.ABC`: `class Exporter(Plugin, abc.ABC, abstract=True)` must work and keep its abstract method checks.

The starter sets `plugin_name` but never registers anything and drops the extra keywords.
