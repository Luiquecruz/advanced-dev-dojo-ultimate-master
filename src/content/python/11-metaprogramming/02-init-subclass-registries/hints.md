`__init_subclass__` runs on the parent each time a subclass is created, with `cls` set to the new subclass. Registration belongs there, not in `__init__`: the tests never create an instance before reading the registry.
---
Class keywords are plain arguments of that call and are never inherited. Check `abstract` first, compute `name if name is not None else cls.__name__`, and look the key up in `Plugin.registry` before writing it, so a duplicate raises without replacing the first class.
---
`object.__init_subclass__` rejects any keyword, and a mixin after `Plugin` in the MRO only gets its keywords if `Plugin` passes them along: call `super().__init_subclass__(**kwargs)` with everything you did not consume. Do not reach for a metaclass: a custom metaclass conflicts with `ABCMeta` when a plugin also inherits from `abc.ABC`.
