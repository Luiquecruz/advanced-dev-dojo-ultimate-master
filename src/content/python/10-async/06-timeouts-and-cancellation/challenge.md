Write three cancellation-aware helpers in `main.py` for a job service.

## `with_deadline(coroutine_factory, seconds)`

`coroutine_factory` is an async function with no parameters. Await `coroutine_factory()` and return its result. When it takes longer than `seconds`, **cancel the work** and raise `TimeoutError`; the work's own cleanup (its `except CancelledError` or `finally`) has run when `TimeoutError` reaches the caller.

## `worker(inbox, recorder)`

`inbox` is an `asyncio.Queue` of **jobs**, async functions with no parameters. The worker runs forever: it takes the next job, awaits it and appends:

- `"done:<result>"` when the job returns;
- `"failed:<ExceptionType>"` (for example `"failed:ValueError"`) when the job raises an ordinary exception, and then it continues with the next job.

When the worker's task is cancelled, whether it is waiting for a job or in the middle of one, it appends `"cleanup"` exactly once and the task **ends as cancelled** (`task.cancelled()` is `True`). Never swallow `CancelledError`.

## `shielded_commit(commit, recorder)`

`commit` is an async function with no parameters. Run `commit()` in a task protected with `asyncio.shield` and return its result.

If the caller of `shielded_commit` is cancelled while the commit runs, append `"caller-cancelled"` and re-raise the `CancelledError`, but the commit task **keeps running to completion**. While it runs, it must be held in the module-level set `PENDING_COMMITS`, and it must leave the set once it is done.
