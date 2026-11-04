Build two stateful helpers using closures. Do **not** use classes or the `global` keyword.

## `make_counter(start=0, step=1)`

Returns a tuple `(next_value, reset)`:

- `next_value()` returns the current value and then advances it by `step`. The first call returns `start`.
- `reset()` sets the counter back to `start`.
- Every call to `make_counter` creates an independent counter.
- Use `nonlocal` for the state.

## `make_history(limit)`

Returns a tuple `(record, entries)` for a bounded history. `limit` is at least 1.

- `record(value)` stores a value. Only the last `limit` values are kept.
- `entries()` returns a **tuple** of the stored values, oldest first.

The tests also read your source: it must contain `nonlocal` and must not contain `global`.
