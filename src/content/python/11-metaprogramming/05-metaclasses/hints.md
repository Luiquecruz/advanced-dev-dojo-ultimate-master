A metaclass's `__new__(mcls, class_name, bases, namespace, **kwargs)` runs when the class statement runs. `namespace` holds only what the class body defined, so `namespace.get("name")` ignores inherited values. Check it, then return `super().__new__(mcls, class_name, bases, namespace, **kwargs)`.
---
`Settings()` calls `type(Settings).__call__(Settings)`, and `type.__call__` runs `__new__` and then `__init__`. A cached instance returned from the class's `__new__` still goes through `__init__` on every call, which is the JavaScript habit of returning early from a constructor. Override `__call__` in the metaclass and call `super().__call__(*args, **kwargs)` only the first time.
---
Store the instance per class: set `cls._instance = None` in the metaclass `__init__` (it runs for every class it builds, subclasses included) or key a dict by class. For `FinalMeta.__new__`, loop over `bases` and raise when `isinstance(base, FinalMeta)`.
