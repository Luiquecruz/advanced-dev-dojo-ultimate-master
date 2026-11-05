A source is a function, so call it to get a coroutine: `asyncio.gather(*(source() for source in sources))`. `gather` returns the values in the order of its arguments.
---
With `return_exceptions=True`, `gather` puts each exception object in the result list instead of raising. Split the list with `isinstance(outcome, BaseException)`, which keeps both halves in input order.
---
`asyncio.wait` needs tasks, not coroutines: create them with `asyncio.create_task`. With `return_when=asyncio.FIRST_COMPLETED` it returns `(done, pending)`. Call `cancel()` on each pending task, then `await asyncio.gather(*pending, return_exceptions=True)` so their `CancelledError` is collected instead of raised, and return `done.pop().result()`.
