Write three context managers for a deployment script in `main.py`, each as a generator function decorated with `@contextlib.contextmanager`. Every one of them must restore or record its teardown **on every way out of the block**, including when the block raises, and must let the block's exception propagate unchanged.

## `temporary_env(mapping, key, value)`

`mapping` is a plain `dict` of settings.

- On enter, set `mapping[key] = value` and yield `value`.
- On exit, restore the previous value. If `key` was **absent** before, remove it again (do not leave `key: None` behind).
- Nested calls on the same mapping restore in reverse order.

## `captured_output()`

- On enter, replace `sys.stdout` with a new `io.StringIO` and yield that `StringIO`, so `print` inside the block writes into it.
- On exit, put the original `sys.stdout` back.

## `section(log, name)`

`log` is a list.

- Append `"enter:<name>"` before the block and `"exit:<name>"` after it.
- Nested sections log in stack order: `enter:outer`, `enter:inner`, `exit:inner`, `exit:outer`.
- Because it is built with `@contextmanager`, a section also works as a decorator: `@section(log, "job")` above a function logs `enter:job` and `exit:job` around **each call** and returns the function's result.
