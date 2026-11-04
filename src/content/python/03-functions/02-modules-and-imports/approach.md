1. Draw the import graph of the starter: `main` imports `config` and `registry`, and `registry` imports `main`. Any arrow that points back up is a cycle.
2. Decide which module owns the registry. Plugins depend on the registry, the application reads it, so the registry module owns `HANDLERS` and `register`.
3. Replace the value import of `LEVEL` with a module import, so the level is read at call time instead of copied at import time.
4. Separate import-time code from script-time code with the `__name__` guard, keeping registration at import time where it belongs.
5. Check both import orders: import `main` first, then start fresh and import `registry` first. Both must succeed.
