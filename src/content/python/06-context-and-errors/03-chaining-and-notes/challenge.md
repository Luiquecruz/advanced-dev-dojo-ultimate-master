A capture service loads its settings from JSON. Write three helpers in `main.py` so that operators always see the root cause and the context of a failure, without changing what each error says. `ConfigError(Exception)` is already defined.

## `load_config(text)`

- Returns the parsed JSON object as a `dict`.
- When `text` is not valid JSON, raises `ConfigError` whose message contains the word `line` (use the decode error's `lineno`), with the original `json.JSONDecodeError` as its **explicit cause** (`__cause__`).
- When `text` is valid JSON but not an object (a list, a number...), raises `ConfigError`.

## `reraise_hidden(function)`

A decorator (keep the wrapped function's metadata with `functools.wraps`).

- The wrapper forwards every argument and returns the function's result.
- When the function raises `KeyError`, the wrapper raises `ConfigError("missing setting: <key>")` instead, where `<key>` is the missing key, and **hides** the `KeyError` from the printed traceback (`__suppress_context__` is `True`, `__cause__` is `None`).
- Any other exception propagates unchanged.

## `annotate(error, **context)`

- Adds one note per keyword argument with `add_note`, formatted `"key=value"`, in **sorted key order**.
- Leaves the message and `args` of the exception untouched.
- Returns the **same** exception object, so `raise annotate(error, order_id=7)` works. Calling it again appends more notes.
