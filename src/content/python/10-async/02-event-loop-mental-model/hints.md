`await asyncio.sleep(0)` between the two `append` calls in `fetch` is the whole trick: it suspends the current task for one tick so every other ready task can take a step.
---
Building a list of coroutines and awaiting them one by one is sequential in Python, because a coroutine starts only when it is awaited. `asyncio.create_task(fetch(name, recorder))` schedules each one right away; awaiting the tasks afterwards only collects their results, in the order you created them.
---
`lazy_coroutine` must not be `async def` and must not wrap anything in a task: `return fetch("lazy", recorder)`. A task (`create_task`, `ensure_future`) starts on the next tick, while a bare coroutine waits for its `await`.
