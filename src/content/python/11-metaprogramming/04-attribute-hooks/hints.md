`__getattr__` only runs after normal lookup fails, so the proxy's own `log` and `_target` never reach it. `__setattr__` is the opposite: it runs for **every** assignment, including the ones in `__init__`. Set the proxy's own attributes with `object.__setattr__(self, name, value)`, which bypasses your hook.
---
Do not intercept every read with `__getattribute__`: inside it, `self.log` is one more attribute read and calls the hook again until `RecursionError`. If you ever need `__getattribute__`, read your own state with `object.__getattribute__(self, name)`, which performs the default lookup without your hook.
---
`Frozen` needs a flag that its own `__setattr__` does not block: a class attribute `_frozen = False` plus `object.__setattr__(self, "_frozen", True)` in `freeze()`. In `Defaults.__getattr__`, read the mapping with `vars(self).get("_defaults", {})` and turn a `KeyError` into `AttributeError`: on a copy, `_defaults` does not exist yet when the hook first runs.
