1. Write `fetch` first and trace it on paper: which line runs when it is called, which when it is awaited, and where the task can be suspended.
2. For the sequential runner, remember that `await` on a coroutine runs it to completion inside the current task before the loop continues.
3. For the concurrent runner, separate scheduling from collecting: create every task first, then await them. Write the recorder order you expect for two names and check it against the ready queue: each task takes one step per tick.
4. Explain why the starter's list of coroutines produces the sequential order, even though the same shape with promises is concurrent in JavaScript.
5. For `lazy_coroutine`, decide which object never runs on its own: a coroutine or a task. Check that the recorder stays empty after a few `sleep(0)` ticks and fills up only after the `await`.
