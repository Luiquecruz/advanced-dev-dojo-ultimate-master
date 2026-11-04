1. For each class, pick the narrowest hook: a fallback for unknown names is `__getattr__`, a rule on every write is `__setattr__`, a rule on deletion is `__delattr__`. None of the three needs `__getattribute__`.
2. Before writing a hook, list the attributes the object needs for itself (`_target`, `log`, `_frozen`, `_defaults`) and decide how each one is stored without passing through the hook: `object.__setattr__` for writes, normal lookup or `object.__getattribute__` for reads.
3. In `Proxy`, read from the target first and log after the read succeeds, so a missing attribute raises `AttributeError` without polluting the log. Forward writes to the target and log them.
4. Make `dir()` honest: union the proxy's own names with the target's in `__dir__`.
5. In `Frozen`, decide what "existing" means (on the instance or its class) and check it only when frozen; deletion is always refused once frozen.
6. In `Defaults`, assume the hook can run on an object whose `__init__` never ran, as `copy` and `pickle` do, and always end with `AttributeError` for unknown names.
