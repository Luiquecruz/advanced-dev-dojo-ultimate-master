1. Move the cache write from `onSuccess` to `onMutate`, so it happens before the request instead of after it.
2. Before writing, cancel in-flight `['todos']` queries: an older refetch must not overwrite the optimistic data.
3. Snapshot the entry with `getQueryData` and return it from `onMutate`; this is the rollback point.
4. Write immutably: `map` for the toggle, `filter` for the delete.
5. In `onError`, put the snapshot back; the row or checkbox returns to its previous state.
6. In `onSettled`, invalidate `['todos']` so the cache converges to the server's truth after success or failure.
7. Surface failures: render the alert from the mutations' `isError` flags so a rollback is never silent.
