A **module** is a `.py` file. The first `import` finds the file, creates a module object, runs the file's top level inside it once and stores the result in `sys.modules`. Every later import of the same name returns that cached object without running anything.

```py
# config.py
print("loading config")
LEVEL = "info"

# main.py
import config          # prints "loading config"
import config          # prints nothing: sys.modules["config"] is reused
print(config.LEVEL)    # attribute lookup on the module object
```

A **package** is a folder of modules. Its `__init__.py` runs when the package is first imported, and `import shop.orders` loads `shop` first, then `shop.orders`.

## How it works

- `import config` binds the name `config` to the module object. `from config import LEVEL` runs the same import, then binds a new name `LEVEL` in your namespace to the object `config.LEVEL` refers to **at that moment**. It is an ordinary assignment, done once.
- A module's top level is **import-time code**. Registrations, constants and decorators run there, once. Expensive work or I/O at import time slows every importer and runs in tests too.
- `__name__` is the module's import name (`"config"`), or `"__main__"` for the file Python was started with. `if __name__ == "__main__":` keeps script-only code from running on import.

Two lines show the difference between the two import forms:

```py
from config import LEVEL
import config

config.LEVEL = "debug"   # what a CLI entry point or a test fixture does
print(LEVEL)             # "info": this name still points at the object bound at import
print(config.LEVEL)      # "debug": looked up on the module each time
```

Assigning another module's attribute is a normal Python idiom: `logging.raiseExceptions = False`, or pytest's `monkeypatch.setattr(config, "LEVEL", "debug")`. Rebinding a module's own top-level name from a function inside it needs a `global` statement, so code that wants a setter usually keeps **one mutable settings object** and changes it in place (`SETTINGS.level = value`). That object is never rebound, so even `from config import SETTINGS` sees the update.

### Registering at import time

The challenge's plugins use a decorator. Writing `@register` on the line above `def handle():` means `handle = register(handle)`: Python builds the function, passes it to `register` and binds the name to whatever `register` returns. A registry decorator appends the function to a list and returns it unchanged, so the act of importing the plugin module fills the registry. Lesson 07 builds decorators that wrap the function instead.

### Circular imports

When `a` imports `b` and `b` imports `a`, the second import finds `a` already in `sys.modules`, but its body is still running: a **partially initialized module**. Asking it for a name that has not been defined yet fails loudly:

```text
ImportError: cannot import name 'register' from partially initialized module 'main'
(most likely due to a circular import)
```

Whether it fails depends on which module is imported first, so a cycle can pass every test and break when a new caller imports the other side. Two fixes:

1. **Move the shared piece out**: put the decorator, constant or base class both modules need into the lower-level module (or a third one), so the dependency points one way.
2. **Import inside the function** that needs it, deferring the lookup to call time. Useful for rare paths, but it hides the dependency.

> **Status as of November 2026:** Python 3.15 (October 2026) adds an explicit `lazy import` statement (PEP 810, Final). This track runs Python 3.14 in Pyodide, where every import runs the module body eagerly on first import.

## Common mistakes

**Treating `from config import LEVEL` as a live view of the setting.** The name holds the value from import time, so a level an entry point or a test sets later never reaches your function. Read the attribute on the module when the value can change:

```py
# wrong: copied once, at import
from config import LEVEL

def current_level():
    return LEVEL

# right: looked up on every call
import config

def current_level():
    return config.LEVEL
```

**Fixing a cycle by moving the import to the bottom of the file.** It passes while `main` is imported first and fails as soon as something imports the plugin module first. Move the decorator and the list it fills into the plugin module (`registry.py` in the challenge), so it no longer imports `main` and the dependency points one way.

## When to choose it

- **`import module` and `module.NAME`** for anything that can be rebound after import: configuration, feature flags, objects tests replace.
- **One mutable settings object** changed in place when the module itself must offer a setter.
- **`from module import name`** for functions, classes and true constants. It reads better and the binding never needs to change.
- **Import-time registration** for plugins and handlers, with the registry owned by the module that the plugins import, never by the application module.
- **Avoid** heavy work at import time; put it in a function the caller runs.
