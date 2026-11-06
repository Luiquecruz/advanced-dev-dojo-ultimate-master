Keep a list of the steps whose action succeeded. When an action raises, that list is exactly what needs compensating; the failing step is never in it because it is appended only after `await invoke(step["action"], context)` returns.
---
Compensate with a `for` loop over `reversed(completed)` and wrap each `await invoke(step["compensate"], context)` in its own `try`/`except Exception`: success appends the name to `compensated`, failure appends it to `failed_compensations`, and the loop keeps going either way.
---
For the idempotent handler, store a **task** in a dict before it finishes, so a concurrent retry finds it: `asyncio.create_task(invoke(handler, request))` runs the handler once, and every caller can `await` the same task (a coroutine can be awaited only once, a task any number of times). Register `task.add_done_callback(...)` to delete the key when the task did not succeed (`task.cancelled() or task.exception() is not None`), so a failure is forgotten.
