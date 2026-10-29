1. For each snippet, mark every callback with its queue: synchronous, nextTick, microtask, timers, poll or check. That classification is also the answer for `queueFor`.
2. Write the synchronous logs first, in source order: the main script always runs to completion.
3. Drain the nextTick queue in insertion order, then the microtask queue in insertion order. Whenever a callback schedules more work, append it to the end of its queue.
4. Repeat step 3 until both queues are empty; only then move to the loop phases in order: timers, poll, check.
5. For async functions, remember that everything before the first `await` is synchronous and the rest is a microtask queued at the moment of the `await`.
6. For I/O callbacks, follow the phase sequence from the poll phase: microtasks, then check (`setImmediate`), then the next iteration's timers.
7. For the busy loop, ask whether anything can run while the `while` loop holds the thread.
