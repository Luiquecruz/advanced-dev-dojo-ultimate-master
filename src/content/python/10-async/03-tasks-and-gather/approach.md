1. Map each helper to its JavaScript cousin (`Promise.all`, `Promise.allSettled`, `Promise.race`) and write down what happens to the other operations when one finishes or fails, in both languages.
2. For `fetch_all`, check that the starter's comprehension runs one source at a time, then replace it with a single `gather` call so every source starts before the first one ends.
3. For `fetch_settled`, gather with `return_exceptions=True` and split the result list by type, keeping input order on both sides.
4. For `first_done`, separate the three phases: schedule every coroutine as a task, wait for the first completion, then clean up the rest.
5. Remember that `cancel()` only delivers `CancelledError` at the task's next `await`. Decide how to wait for the cancelled tasks without letting their `CancelledError` escape from `first_done`.
6. Trace the test with a coroutine that never finishes: it must be cancelled, not awaited forever.
