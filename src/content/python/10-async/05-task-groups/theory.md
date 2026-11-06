`asyncio.TaskGroup` (Python 3.11) is **structured concurrency**: tasks started in the group cannot outlive the `async with` block. The block exits only when every task is done, and the first failure cancels the others.

```py
import asyncio

async def check(item):
    await asyncio.sleep(0.01)
    if item == "bad":
        raise ValueError(f"invalid {item}")
    return item.upper()

async def main():
    try:
        async with asyncio.TaskGroup() as group:
            tasks = [group.create_task(check(item)) for item in ["a", "bad", "c"]]
    except* ValueError as failures:
        print("invalid:", [str(error) for error in failures.exceptions])  # ['invalid bad']
        return
    print([task.result() for task in tasks])

asyncio.run(main())
```

## How it works

`asyncio.gather` (previous lesson) raises the first error and walks away: the other tasks keep running in the background, their results and errors ignored. A `TaskGroup` does what most callers actually want: when one task fails, it **cancels the siblings, waits for them to finish cancelling**, and then raises.

- **`group.create_task(coroutine)`** schedules the coroutine and keeps a strong reference to the task, so nothing is garbage collected mid-flight.
- **On exit**, the group waits for all its tasks. More tasks may be added while it waits.
- **On the first failure** (any exception except `CancelledError`), the group cancels every remaining task and the body itself if it is still running. Tasks that fail before the cancellation reaches them, for example in the same pass of the loop, are collected too, so the group can hold several errors.
- **After all tasks are done**, the failures are raised together as an `ExceptionGroup` (or a `BaseExceptionGroup` when one of them is not an `Exception`). `KeyboardInterrupt` and `SystemExit` are re-raised as themselves.

`except*` comes from PEP 654 (Python 3.11), the same PEP that introduced `ExceptionGroup`. Each `except*` clause receives a **subgroup** with the matching exceptions, so `len(group.exceptions)` counts them. Several clauses can run for one group, and anything no clause matched is re-raised as a smaller `ExceptionGroup`:

```py
try:
    raise ExceptionGroup("batch", [ValueError("a"), KeyError("b"), ValueError("c")])
except* ValueError as invalid:
    print(len(invalid.exceptions))   # 2
# the KeyError propagates as ExceptionGroup('batch', [KeyError('b')])
```

Do not reach for `except ExceptionGroup:` and a loop over `.exceptions`: it also swallows every type you did not plan for.

## Common mistakes

**A plain `except ValueError:` around a task group.** The group always raises an `ExceptionGroup`, even for a single failure, so the clause never matches and the error propagates past it.

```py
# wrong: never runs; the ValueError arrives wrapped in an ExceptionGroup
try:
    async with asyncio.TaskGroup() as group:
        group.create_task(check("bad"))
except ValueError:
    ...

# right: except* matches inside the group
try:
    async with asyncio.TaskGroup() as group:
        group.create_task(check("bad"))
except* ValueError as invalid:
    count = len(invalid.exceptions)
```

Counting with `= 1` instead of `len(invalid.exceptions)` is the second slip: several tasks can fail before the cancellation reaches them.

## Legacy vs modern

Before 3.11, the usual tool was `gather`, with hand-written cancellation of the other tasks in an `except`. The asyncio documentation now recommends `TaskGroup` over `gather` for groups of tasks that should fail together. `gather` remains useful when partial results are acceptable (`return_exceptions=True`).

Python 3.15 adds `TaskGroup.cancel()` to stop a group early without raising. This track runs Python 3.14, where stopping a group early still means raising a custom exception inside it and catching it outside. From 3.14 (PEP 758), `except* ValueError, TypeError:` may also be written without parentheses.

## When to choose it

- **`TaskGroup`** whenever several tasks belong to one operation: fan-out calls for one request, a batch of items, a pipeline's workers. One failure stops the operation.
- **`except*`** to handle each failure kind separately and let the unexpected ones propagate.
- **`gather(..., return_exceptions=True)`** instead, when every result matters on its own and one failure must not cancel the others.
- **Keep the group small and local**: a group that lives for the whole program becomes a place where one bug cancels everything.
