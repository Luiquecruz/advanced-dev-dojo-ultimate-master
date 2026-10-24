1. Derive `optimisticTodos` from the real `todos` with `useOptimistic` and an updater that appends the value flagged as `pending`.
2. In the form action, apply the optimistic todo before the first `await` so it renders instantly.
3. On success, append the server todo to the real state inside `startTransition`; React swaps the optimistic layer for the real list when the Action ends.
4. On failure, only set the error message; the optimistic item vanishes automatically because the real state never changed.
5. Render the list from `optimisticTodos` and show the `Saving...` marker for pending items.
