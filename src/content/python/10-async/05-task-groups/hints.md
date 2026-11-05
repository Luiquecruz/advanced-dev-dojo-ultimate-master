Create the tasks inside `async with asyncio.TaskGroup() as group:` with `group.create_task(handler(item))` and keep them in a list. After the block, every task is done, so `task.result()` returns each value without awaiting.
---
You do not write any cancellation code: the group cancels the remaining tasks on the first failure, waits for them, and raises an `ExceptionGroup` when the block exits.
---
Write one `except* ValueError as group:` clause and one `except* ConnectionError as group:` clause. Each `group` is a subgroup holding only the matching exceptions, so `len(group.exceptions)` is the count. Exceptions that no clause matches are re-raised for you as a smaller `ExceptionGroup`.
