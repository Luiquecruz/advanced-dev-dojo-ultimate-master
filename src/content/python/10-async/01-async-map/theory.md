**Question this module answers:** what runs concurrently, what blocks everyone, and who owns cancellation?

## Prerequisites

Module 05 (generators: a coroutine is a suspendable function), module 06 (context managers, `ExceptionGroup` and `except*`) and module 09 (annotations used in the solutions).

## Cooperative concurrency

`asyncio` runs many **tasks** on **one thread**. A task gives control back to the event loop only at an `await` that has to wait; then the loop runs another ready task. Nothing preempts a running task.

```py
import asyncio

async def fetch(name, delay):
    await asyncio.sleep(delay)          # waits: the loop runs other tasks meanwhile
    return name

async def main():
    async with asyncio.TaskGroup() as group:
        users = group.create_task(fetch("users", 0.02))
        orders = group.create_task(fetch("orders", 0.01))
    print(users.result(), orders.result())   # both waits overlapped: about 20 ms in total

asyncio.run(main())
```

## Three facts the module builds on

- **Calling does not start.** `fetch("users", 1)` returns a coroutine object, a paused call that runs only when awaited or wrapped in a task.
- **Tasks can be cancelled.** A cancelled task receives `CancelledError` at its current `await`, so a timeout or a failed sibling can stop work that is no longer needed.
- **Most libraries are synchronous.** A blocking call in a coroutine freezes every task, and Python does not move I/O to a thread for you.

In CPython a program starts with `asyncio.run(main())`. In this sandbox a loop is already running: tests `await` your coroutines, and the Run button handles the `asyncio.run` in `demo.py`.

## The path

The event loop and coroutines, async iterators and context managers, tasks with `gather` and `wait`, task groups with `except*`, timeouts and cancellation, queues, locks and semaphores, then a quiz on blocking calls, threads and the GIL. The module ends with an ADR.

## When to choose it

The closing decision is the concurrency design of an ingestion service: which work stays on the event loop and which goes to a process pool, how far to fan out, how big the queue may grow, how failures surface and how shutdown drains, each sized from the service's own numbers.
