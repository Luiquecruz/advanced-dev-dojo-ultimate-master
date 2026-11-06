The async versions of two familiar protocols let a loop or a `with` block **await** in the middle:

- **Async iteration**: `async for` calls `__aiter__` once and `await`s `__anext__()` for each item, until `StopAsyncIteration`. An `async def` containing `yield` is an **async generator** (PEP 525) that implements both for you.
- **Async context managers**: `async with` awaits `__aenter__()` on the way in and `__aexit__(exc_type, exc, traceback)` on the way out, on success, error and cancellation (lesson 06) alike.

```py
import asyncio

async def countdown(start):
    try:
        for value in range(start, 0, -1):
            await asyncio.sleep(0.01)     # an await inside the loop body
            yield value
    finally:
        print("countdown closed")

class Session:
    async def __aenter__(self):
        print("open")
        return self

    async def __aexit__(self, exc_type, exc, traceback):
        print("close")                    # returns None: exceptions propagate

async def main():
    async with Session():
        print([value async for value in countdown(3)])   # async comprehension

asyncio.run(main())   # open, countdown closed, [3, 2, 1], close
```

## How it works

- **Laziness**: an async generator runs only while someone awaits its next item. Code after a `yield` runs when the consumer asks for the following item, which is how a paginator fetches page 2 only after page 1 is used up. Collecting everything into a list first gives up that streaming.
- **`aclose()`** throws `GeneratorExit` in at the paused `yield`, so `finally` blocks and `async with` exits inside the generator run. A generator suspended at a `yield` runs its `finally` only when it is closed: by `aclose()`, by running to the end, or by the garbage collector much later. `contextlib.aclosing` (3.10) calls it on exit; the docs recommend it because the generator's cleanup otherwise runs "in an unexpected context", perhaps after the tasks it depends on are gone.
- **`__aexit__`** receives the exception type, value and traceback (or three `None`s). Cleanup that must always happen goes there or in a `finally`.
- **A truthy `__aexit__` swallows the error.** Returning `True` tells Python the exception was handled. Return `None` unless suppressing is the point.
- **`contextlib.asynccontextmanager`** (3.7) builds an async context manager from an async generator with one `yield`, the async twin of `@contextmanager`.
- **Builtins**: `aiter()` and `anext()` (3.10) are the async counterparts of `iter()` and `next()`.

## Common mistakes

**`break` out of an `async for` and expecting the generator to clean up.** `break` just stops pulling: the async generator stays suspended at its `yield`, holding whatever it opened, until the garbage collector hands it to the event loop's finalizer hook, at some later point or at loop shutdown.

```py
# wrong: read_rows is still suspended; its finally has not run
async for row in read_rows():
    if row.done:
        break

# right: aclose() runs on exit, so the finally runs before the next line
async with contextlib.aclosing(read_rows()) as rows:
    async for row in rows:
        if row.done:
            break
```

The second slip is an `__aexit__` written as "return `True` when cleanup worked": every failure inside the block disappears.

## When to choose it

- **An async generator** for streams that arrive in chunks: paginated APIs, database cursors, message subscriptions. The consumer controls the pace.
- **`aclosing`** whenever a consumer may stop early and the generator holds a resource (a connection, a file, a lock).
- **A class with `__aenter__`/`__aexit__`** for resources with state and methods; **`@asynccontextmanager`** for a quick setup and teardown pair.
- **A plain `async def` returning a list** when the data is small and always consumed whole: laziness adds nothing there.
