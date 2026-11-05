A **task** is a coroutine scheduled on the event loop. `asyncio.gather` creates one task per coroutine, waits for all of them and returns their results **in the order you passed them**, whatever order they finish in.

```py
import asyncio

async def load(name, delay):
    await asyncio.sleep(delay)
    return name

async def main():
    results = await asyncio.gather(load("slow", 0.03), load("fast", 0.01))
    print(results)               # ['slow', 'fast']: input order, not finishing order

asyncio.run(main())
```

Each argument of `gather` is a coroutine object, a paused call; `gather` turns each one into a task, so they all start before the first one finishes.

## How it works

Three combinators cover most needs. They differ in what they do with the other tasks when one finishes or fails:

| Combinator | Returns | What happens to the others |
| --- | --- | --- |
| `gather(*aws)` | values in argument order | the first error propagates at once; the others **keep running** |
| `gather(*aws, return_exceptions=True)` | values and exception objects, in argument order | nothing is raised; every task runs to the end |
| `wait(tasks, return_when=FIRST_COMPLETED)` | `(done, pending)` sets of tasks | the pending tasks **keep running** until you cancel them |
| `as_completed(aws)` | results in finishing order | the rest keep running while you process each one |

- **`gather`** wraps plain coroutines in tasks. With `return_exceptions=True`, each failure takes its place in the result list as an exception object, so you split values from errors by type.
- **`wait`** raises nothing. Since Python 3.11 it refuses bare coroutines: create the tasks yourself, which is also how you keep references to cancel them.
- **`as_completed`** also works with `async for` since 3.13, yielding the original tasks.
- **Results and errors** live on the task: `task.result()` returns the value or re-raises the exception; `task.exception()` returns it without raising.
- **`cancel()` only requests cancellation**: the task receives `CancelledError` at its next `await` and may run `finally` blocks first. Awaiting the cancelled tasks is how you know the cleanup is over.
- **The loop keeps only weak references to tasks.** A task nobody references can be garbage collected before it finishes, so keep fire-and-forget tasks in a set:

```py
background = set()
task = asyncio.create_task(send_metrics())
background.add(task)                        # strong reference
task.add_done_callback(background.discard)  # drop it when done
```

## Common mistakes

**Taking the winner of a race and leaving the losers running.** After `wait(..., FIRST_COMPLETED)` the pending tasks still hold connections, timers and memory, and a `cancel()` that is never awaited returns before their cleanup has run.

```py
# wrong: the replica keeps running in the background
done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
fastest = done.pop().result()

# right: cancel the losers and wait until they have stopped
done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
for task in pending:
    task.cancel()
await asyncio.gather(*pending, return_exceptions=True)
fastest = done.pop().result()
```

`return_exceptions=True` on that last `gather` collects each `CancelledError` instead of raising it.

## Legacy vs modern

`gather` is the older API and is still fine for "run these, give me a list". For a group of tasks that must fail together, `asyncio.TaskGroup` (3.11, next lesson) cancels the siblings for you; the asyncio docs recommend it over `gather` for that reason.

## When to choose it

- **`gather`** for a fixed list of independent calls whose results you need in input order; add `return_exceptions=True` when partial results are useful.
- **`wait(..., FIRST_COMPLETED)` plus cancellation** for races: hedged requests, first replica to answer, a fallback after a timeout.
- **`as_completed`** to process results as they arrive.
- **A `TaskGroup`** when one failure makes the other results useless and the remaining work must stop.
