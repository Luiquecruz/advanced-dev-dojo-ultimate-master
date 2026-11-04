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

## Coming from TypeScript and JavaScript

A JavaScript `async` function starts running **synchronously** when you call it, up to its first `await`, and the promise it returns settles whether or not anyone awaits it. So this idiom is concurrent in JavaScript:

```ts
const pending = names.map((name) => fetchUser(name));  // every request is already running
const results = [];
for (const promise of pending) results.push(await promise);
```

The same shape in Python is **sequential**. The list holds coroutine objects that have not started; each one starts only when the loop reaches its `await`, and the next one waits for it to finish:

```py
pending = [fetch(name) for name in names]          # nothing runs yet
results = [await coroutine for coroutine in pending]  # start a, end a, start b, end b...
```

To run them at the same time, hand each coroutine to the event loop as a task:

```py
tasks = [asyncio.create_task(fetch(name)) for name in names]  # scheduled, start on the next tick
results = [await task for task in tasks]                      # start a, start b, end a, end b
```

The second habit is the forgotten `await`. A JavaScript promise that nobody awaits still runs. A Python coroutine that nobody awaits never runs at all, and when it is garbage collected CPython prints `RuntimeWarning: coroutine 'fetch' was never awaited`. Dev Dojo turns that warning into a failed test.

## How it works

- **`await coroutine`** runs the coroutine inline, in the current task, like a function call that may pause. It does not schedule anything. The current task is suspended only when the chain reaches something that is not ready, such as a sleep, a lock or a socket.
- **`await asyncio.sleep(0)`** is the smallest suspension: the task goes to the back of the ready queue, every other ready task gets one step, then it continues.
- **`asyncio.create_task(coroutine)`** wraps a coroutine in a `Task` and schedules its first step. It returns at once; the coroutine starts the next time the current task suspends. A task is a future: awaiting it returns its result or raises its exception.
- **The event loop** runs one step of one task at a time on a single thread. Nothing preempts a running step: between two `await`s, your code has the loop to itself.
- **`asyncio.run(main())`** is how a CPython program starts: it creates a loop, runs `main` to completion, cancels leftovers and closes the loop. It must not be called while a loop is already running. In this sandbox Pyodide already runs a loop backed by the browser, so tests `await` your coroutines directly, and the Run button handles the `asyncio.run` at the bottom of `demo.py` for you.

## Legacy vs modern

Generator-based coroutines (`@asyncio.coroutine` with `yield from`) were removed in Python 3.11; `async def` and `await` (PEP 492, Python 3.5) are the only form.

> **Status as of November 2026:** Python 3.15 is the latest release and this track runs 3.14. Since 3.14, `asyncio.get_event_loop()` raises `RuntimeError` when no loop is running instead of creating one, and `asyncio.iscoroutinefunction()` is deprecated in favor of `inspect.iscoroutinefunction()`.

## When to choose it

- **`await` a coroutine directly** when you need its result before the next step: it costs nothing and keeps the order obvious.
- **A task** when work should progress while you do something else, or when several independent waits should overlap.
- **Avoid async entirely** for code that never waits on I/O: making a CPU-bound function `async` adds overhead and runs it exactly as sequentially.
