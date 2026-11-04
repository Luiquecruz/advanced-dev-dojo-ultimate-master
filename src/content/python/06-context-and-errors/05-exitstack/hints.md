`stack.enter_context(opener())` enters one resource, registers its `__exit__`, and returns the entered value. Build the list with it inside `with ExitStack() as stack:`; a failure in the middle leaves the `with` and closes what was registered.
---
`open_all` needs only the stack and a `yield` inside its `with` block: the generator pauses at `yield` while the caller's block runs, and the stack unwinds (LIFO, failing closes included) when the generator resumes or receives the exception.
---
In `ResourcePool.__init__`, open everything inside `with ExitStack() as stack:` and, as the last statement inside it, keep `self._stack = stack.pop_all()`. The temporary stack is then empty when its `with` ends, and `close()` is just `self._stack.close()`.
