Cancelling a task in asyncio **raises `asyncio.CancelledError` inside it**, at the `await` where it is suspended. The task can run cleanup in `finally` or `except CancelledError`, and then it must let the error propagate. Timeouts are built on the same mechanism: `asyncio.timeout()` cancels the block when the deadline passes and turns the cancellation into `TimeoutError`.

```py
import asyncio

async def download(recorder):
    try:
        await asyncio.sleep(10)       # cancellation arrives here as CancelledError
    finally:
        recorder.append("closed connection")

async def main():
    recorder = []
    try:
        async with asyncio.timeout(0.05):
            await download(recorder)
    except TimeoutError:
        print("too slow:", recorder)  # too slow: ['closed connection']

asyncio.run(main())
```

## How it works

- **`task.cancel()`** marks the task; the next time it runs, `CancelledError` is thrown in at its current `await`. `finally` blocks and `async with` exits run during the unwinding.
- **Swallowing** a cancellation (catching it and not re-raising) makes `cancel()` silently fail: the task carries on, and shutdown code waiting for it hangs. If you truly must suppress it, call `task.uncancel()`; almost no application code should.
- **`asyncio.timeout(seconds)`** (3.11) cancels the current task when the deadline passes, then converts the resulting `CancelledError` into `TimeoutError` at the block's exit. It can be nested and rescheduled. `asyncio.wait_for(aw, seconds)` does the same for a single awaitable and, since 3.12, is implemented with `timeout()`.
- **A deadline is not a race.** `asyncio.wait({work}, timeout=0.05)` only reports that `work` is not done yet and leaves it running in the background. `asyncio.timeout()` and `wait_for()` cancel the work and wait for its cleanup before raising.
- **`asyncio.shield(task)`** protects the inner task from cancellation coming from the awaiting side: the caller still gets `CancelledError`, but the inner task keeps running. The shielded task then has no awaiter, so **keep a reference** to it (for example in a set with `add_done_callback(set.discard)`); the loop holds only a weak one.

## Common mistakes

**A catch-all around each job in a long-running loop.** Cancellation can arrive at *any* `await`, and a bare `except:` turns it into "just another failed job": the worker logs it and takes the next one, so it can never be stopped.

```py
# wrong: also catches CancelledError
while True:
    job = await inbox.get()
    try:
        await job()
    except:
        log("job failed")

# right: CancelledError is a BaseException, so it passes through
while True:
    job = await inbox.get()
    try:
        await job()
    except Exception:
        log("job failed")
```

`CancelledError` has been a subclass of `BaseException`, not `Exception`, since Python 3.8. Bare `except:`, `except BaseException` and `except CancelledError` without `raise` all swallow it.

## Legacy vs modern

`asyncio.TimeoutError` is a deprecated alias of the builtin `TimeoutError` since 3.11; catch `TimeoutError`. Before 3.8, `CancelledError` derived from `Exception`, which is why older code is full of `except Exception` blocks that swallowed cancellations.

## When to choose it

- **`async with asyncio.timeout(...)`** around a group of awaits that share one deadline; **`wait_for`** for one call.
- **`finally`** for cleanup that must run on success, failure and cancellation; re-raise every `CancelledError` you catch.
- **`except Exception`** for per-item error handling inside long-running loops.
- **`shield`** only for short critical sections (committing a transaction, flushing a buffer) that must finish even when the caller gives up; never as a way to ignore cancellation.
