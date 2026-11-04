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

## Coming from TypeScript and JavaScript

The combinators map almost one to one, with one difference that changes how you write them: **Python tasks can be cancelled, JavaScript promises cannot**.

| JavaScript | asyncio | What happens to the others |
| --- | --- | --- |
| `Promise.all(ps)` | `gather(*aws)` | first error propagates; the others **keep running** |
| `Promise.allSettled(ps)` | `gather(*aws, return_exceptions=True)` | exceptions come back as values in the list |
| `Promise.race(ps)` | `wait(tasks, return_when=FIRST_COMPLETED)` | returns `(done, pending)`; pending tasks keep running until you cancel them |

The habit that breaks is porting `Promise.race` literally. In JavaScript the losing promises cannot be stopped, so nobody tries. In Python they are tasks that keep holding connections, timers and memory until you cancel them:

```ts
const fastest = await Promise.race([primary(), replica()]);  // the loser keeps running, nothing to do about it
```

```py
tasks = [asyncio.create_task(primary()), asyncio.create_task(replica())]
done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
for task in pending:
    task.cancel()                                     # request cancellation
await asyncio.gather(*pending, return_exceptions=True)  # wait until they actually stopped
fastest = done.pop().result()
```

`cancel()` only *requests* cancellation: the task receives `CancelledError` at its next `await` and may run `finally` blocks first. Awaiting the cancelled tasks is how you know the cleanup is over.

The second habit is fire-and-forget. A JavaScript promise stays alive until it settles. The asyncio event loop keeps only **weak references** to tasks, so a task nobody references can be garbage collected before it finishes:

```py
asyncio.create_task(send_metrics())        # may vanish mid-flight
background = set()
task = asyncio.create_task(send_metrics())
background.add(task)                        # strong reference
task.add_done_callback(background.discard)  # drop it when done
```

## How it works

- **`gather`** wraps plain coroutines in tasks. Without `return_exceptions`, the first exception is raised in the awaiting task at once; the other tasks are **not** cancelled. With `return_exceptions=True`, nothing is raised: each failure takes its place in the result list as an exception object, so you can split values from errors by type.
- **`wait(tasks, return_when=...)`** returns two sets of tasks and raises nothing. Since Python 3.11 it refuses bare coroutines: create the tasks yourself, which is also how you keep references to cancel them.
- **`as_completed(aws)`** yields results in finishing order. Since 3.13 it also works with `async for`, yielding the original tasks.
- **Results and errors** live on the task: `task.result()` returns the value or re-raises the exception; `task.exception()` returns it without raising.

## Legacy vs modern

`gather` is the older API and is still fine for "run these, give me a list". For a group of tasks that must fail together, `asyncio.TaskGroup` (3.11, next lesson) cancels the siblings for you; the asyncio docs recommend it over `gather` for that reason.

## When to choose it

- **`gather`** for a fixed list of independent calls whose results you need in input order; add `return_exceptions=True` when partial results are useful.
- **`wait(..., FIRST_COMPLETED)` plus cancellation** for races: hedged requests, first replica to answer, a fallback after a timeout.
- **`as_completed`** to process results as they arrive.
- **A `TaskGroup`** when one failure makes the other results useless and the remaining work must stop.
