A small service has three modules: `config.py` (log level), `registry.py` (request handlers registered at import time) and `main.py` (the application). It works when `main` is imported first, but it has three import bugs. Repair them. `config.py` is already correct.

## `main.current_level()`

Return the **current** log level. An entry point or a test changes the level after import by rebinding the module attribute, `config.LEVEL = "debug"`; from then on `current_level()` must return `"debug"`. The starter binds the value once with `from config import LEVEL`; read it through the module instead.

## `main.handlers()`

Return the names of the registered handlers, in definition order: `["ping", "health"]`. Importing `registry` or `main` again must reuse the cached module, and neither a new import nor repeated `handlers()` calls may register a handler twice.

## Break the circular import

`registry.py` imports `register` from `main`, and `main` imports the handlers back from `registry`. Importing `registry` before `main` fails with an `ImportError`.

- Move the shared pieces into `registry.py`: a module-level list `HANDLERS` and a decorator `register(function)` that appends the function to it and returns it unchanged.
- `registry.py` must **not import `main`** at all. `main` reads `registry.HANDLERS`.

## Guard the script block

`main.py` ends with code that should only run when the file is executed as a script: it sets `RAN_AS_SCRIPT = True` and prints a summary from `run_as_script()`. Put it under `if __name__ == "__main__":` so importing `main` leaves `RAN_AS_SCRIPT` as `False`.
