Calling an `async def` function runs **none** of its body. It returns a **coroutine object**, a paused computation. The body runs only when something drives it: an `await` in another coroutine, or the event loop through a **task**.

```py
import asyncio

async def fetch(name):
    print("start", name)
    await asyncio.sleep(0)       # suspend: let the loop run something else
    print("end", name)
    return f"data:{name}"

async def main():
    pending = fetch("users")     # nothing printed yet
    print(type(pending).__name__)  # coroutine
    print(await pending)         # start users, end users, data:users

asyncio.run(main())              # CPython entry point: create a loop, run main, close the loop
```

## How it works

- **`await coroutine`** runs the coroutine inline, in the current task, like a function call that may pause. It does not schedule anything. The current task is suspended only when the chain reaches something that is not ready, such as a sleep, a lock or a socket.
- **`await asyncio.sleep(0)`** is the smallest suspension: the task goes to the back of the ready queue, every other ready task gets one step, then it continues.
- **`asyncio.create_task(coroutine)`** wraps a coroutine in a `Task` and schedules its first step. It returns at once; the coroutine starts the next time the current task suspends. A task is a future: awaiting it returns its result or raises its exception.
- **The event loop** runs one step of one task at a time on a single thread. Nothing preempts a running step: between two `await`s, your code has the loop to itself.
- **`asyncio.run(main())`** is how a CPython program starts: it creates a loop, runs `main` to completion, cancels leftovers and closes the loop. It must not be called while a loop is already running. In this sandbox Pyodide already runs a loop backed by the browser, so tests `await` your coroutines directly, and the Run button handles the `asyncio.run` at the bottom of `demo.py` for you.

## Common mistakes

**Creating every coroutine first and expecting them to run at the same time.** The list holds paused calls that have not started; each one starts only when the loop reaches its `await`, and the next one waits for it to finish. The code is correct, just sequential.

```py
# wrong: sequential; start a, end a, start b, end b
pending = [fetch(name) for name in names]
results = [await coroutine for coroutine in pending]

# right: every task is scheduled before the first await; start a, start b, end a, end b
tasks = [asyncio.create_task(fetch(name)) for name in names]
results = [await task for task in tasks]
```

The second slip is the forgotten `await`: `fetch("users")` on its own line never runs at all, and when the coroutine is garbage collected CPython prints `RuntimeWarning: coroutine 'fetch' was never awaited`. Constela Mission turns that warning into a failed test.

## Legacy vs modern

Generator-based coroutines (`@asyncio.coroutine` with `yield from`) were removed in Python 3.11; `async def` and `await` (PEP 492, Python 3.5) are the only form.

This track runs Python 3.14. In 3.14, `asyncio.get_event_loop()` raises `RuntimeError` when there is no current loop instead of creating one (a loop installed with `asyncio.set_event_loop()` is returned even when it is not running), and `asyncio.iscoroutinefunction()` is deprecated in favor of `inspect.iscoroutinefunction()`.

## When to choose it

- **`await` a coroutine directly** when you need its result before the next step: it costs nothing and keeps the order obvious.
- **A task** when work should progress while you do something else, or when several independent waits should overlap.
- **Avoid async entirely** for code that never waits on I/O: making a CPU-bound function `async` adds overhead and runs it exactly as sequentially.
