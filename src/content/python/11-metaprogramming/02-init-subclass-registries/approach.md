1. Decide when registration must happen: at class creation, because the application looks classes up by name before any instance exists. That rules out `__init__` and points at `__init_subclass__`.
2. Separate the keywords: `name` and `abstract` belong to `Plugin`, everything else belongs to some other class in the MRO. Forward the rest with `super().__init_subclass__(**kwargs)` before doing your own work.
3. Treat `abstract` as a statement about one class only. Class keywords are not inherited, so a subclass of an abstract base is concrete unless it says otherwise.
4. Compute the name from the keyword or from `cls.__name__`, never from an attribute that a parent plugin may have set, then check the registry before writing so a duplicate fails without replacing the first entry.
5. Keep the registry on `Plugin` itself and write it as `Plugin.registry[...]`, so every family of plugins shares one dict and nothing is created at import time.
6. Run the demo: both exporters appear before any instance is created, and the second `"csv"` is rejected at its class statement.
