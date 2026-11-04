`from config import LEVEL` binds a new name in `main` to the value at import time. `import config` keeps a reference to the module object, and `config.LEVEL` is looked up on every call.
---
The cycle exists because the decorator lives in the application module while the plugin module needs it. Define `HANDLERS = []` and `register` in `registry.py`, decorate `ping` and `health` there, and delete the `from main import ...` line.
---
`main` only needs `import config` and `import registry` at the top, then `handlers()` builds `[function.__name__ for function in registry.HANDLERS]`. The last two lines go inside `if __name__ == "__main__":`.
