`async with asyncio.timeout(seconds): return await coroutine_factory()` is the whole of `with_deadline`. On expiry the block is cancelled, the work unwinds, and `TimeoutError` comes out of the `async with`.
---
In the worker, catch job failures with `except Exception as error:`, which does not match `CancelledError`, and put the whole `while True` loop inside `try: ... finally: recorder.append("cleanup")`. The `finally` runs while the cancellation propagates, so the task still ends as cancelled.
---
For the commit: `task = asyncio.create_task(commit())`, then `PENDING_COMMITS.add(task)` and `task.add_done_callback(PENDING_COMMITS.discard)`. Await `asyncio.shield(task)` inside `try`, and in `except asyncio.CancelledError:` record and `raise`.
