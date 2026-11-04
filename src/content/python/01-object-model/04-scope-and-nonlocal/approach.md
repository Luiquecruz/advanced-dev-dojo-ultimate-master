1. Store the counter state in a variable of the enclosing function, initialized from `start`.
2. In `next_value`, declare the variable `nonlocal`, remember the current value, advance by `step`, and return what you remembered.
3. In `reset`, declare `nonlocal` again and assign `start`.
4. For the history, keep a list in the enclosing scope; `record` appends and drops the oldest items beyond `limit`; `entries` returns a tuple copy.
5. Confirm that two calls to `make_counter` do not share state and that the source never uses `global`.
