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

## Coming from TypeScript and JavaScript

ES modules export **live bindings**: when the exporting module reassigns `export let level`, every importer sees the new value. Python's `from config import LEVEL` does not work that way. It creates a new name `LEVEL` in the importing module and binds it to whatever object `config.LEVEL` referenced **at that moment**. Later rebinding inside `config` is invisible to it.

```ts
// config.ts
export let level = "info";
export function setLevel(value: string) { level = value; }

// main.ts
import { level, setLevel } from "./config";
setLevel("debug");
console.log(level);      // "debug": live binding
```

```py
from config import LEVEL, set_level
set_level("debug")
print(LEVEL)             # "info": a copy of the reference taken at import

import config
print(config.LEVEL)      # "debug": looked up on the module each time
```

The mistake is assuming `from x import y` is a live view. When a value can change after import, import the module and read the attribute.

## How it works

- `import config` binds the name `config` to the module object. `from config import LEVEL` runs the same import, then copies one attribute into your namespace.
- A module's top level is **import-time code**. Registrations, constants and decorators run there, once. Expensive work or I/O at import time slows every importer and runs in tests too.
- `__name__` is the module's import name (`"config"`), or `"__main__"` for the file Python was started with. `if __name__ == "__main__":` keeps script-only code from running on import.

### Circular imports

Node returns a partially filled `exports` object when two modules `require` each other, and the missing members show up as `undefined`. Python does the same with a **partially initialized module**, but asking it for a name that has not been defined yet fails loudly:

```text
ImportError: cannot import name 'register' from partially initialized module 'main'
(most likely due to a circular import)
```

Whether it fails depends on which module is imported first, so a cycle can pass every test and break when a new caller imports the other side. Two fixes:

1. **Move the shared piece out**: put the decorator, constant or base class both modules need into the lower-level module (or a third one), so the dependency points one way.
2. **Import inside the function** that needs it, deferring the lookup to call time. Useful for rare paths, but it hides the dependency.

> **Status as of November 2026:** Python 3.15 (October 2026) adds an explicit `lazy import` statement (PEP 810, Final). This track runs Python 3.14 in Pyodide, where every import runs the module body eagerly on first import.

## When to choose it

- **`import module` and `module.NAME`** for anything that can change after import: configuration, feature flags, objects tests replace.
- **`from module import name`** for functions, classes and true constants. It reads better and the binding never needs to change.
- **Import-time registration** for plugins and handlers, with the registry owned by the module that the plugins import, never by the application module.
- **Avoid** heavy work at import time; put it in a function the caller runs.
