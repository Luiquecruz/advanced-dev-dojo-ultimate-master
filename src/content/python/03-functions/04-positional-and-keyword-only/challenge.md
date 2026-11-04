A database client is about to become a public API. Lock down how its function may be called, then write a small introspection helper in `main.py`.

## `connect(host, /, port=5432, *, ssl=True, timeout=None)`

Return the settings as a dict: `{"host": host, "port": port, "ssl": ssl, "timeout": timeout}`.

- `host` is **positional-only**: `connect(host="db")` raises `TypeError`.
- `port` may be passed by position or by name.
- `ssl` and `timeout` are **keyword-only**: `connect("db", 5433, False)` raises `TypeError`.

## `describe_signature(function)`

Return a dict mapping every parameter name of `function` to the **name of its kind**, in declaration order, using `inspect.signature`: one of `"POSITIONAL_ONLY"`, `"POSITIONAL_OR_KEYWORD"`, `"VAR_POSITIONAL"`, `"KEYWORD_ONLY"`, `"VAR_KEYWORD"`.

It must work for any callable with a signature, including builtins such as `divmod`.
