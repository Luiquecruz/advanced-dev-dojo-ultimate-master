Raising inside `except` already sets `__context__`, but only `raise ... from error` sets `__cause__`. Use `except json.JSONDecodeError as error:` and end the handler with `raise ConfigError(...) from error`.
---
`from None` is the opposite: `raise ConfigError(f"missing setting: {error.args[0]}") from None` sets `__suppress_context__` and leaves `__cause__` empty. Catch `KeyError` only, so other exceptions pass through.
---
`add_note` mutates the exception in place and returns `None`: loop over `sorted(context)`, call `error.add_note(f"{key}={context[key]}")`, then `return error`. Never rebuild `error.args`.
