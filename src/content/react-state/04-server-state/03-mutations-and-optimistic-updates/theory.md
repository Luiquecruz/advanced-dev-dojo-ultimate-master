## Optimistic means "assume success, prepare to be wrong"

A pessimistic mutation waits for the server and then updates the cache. That is safe but feels slow: a checkbox that takes 400 ms to tick feels broken. An **optimistic** mutation writes the expected result into the cache immediately, keeps a **snapshot**, and restores it if the server says no. The server stays the source of truth because the cache is re-synced when the mutation **settles**.

## The full lifecycle

```js
export function useToggleTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateTodo,
    onMutate: async ({ id, completed }) => {
      await queryClient.cancelQueries({ queryKey: ['todos'] });
      const previous = queryClient.getQueryData(['todos']);
      queryClient.setQueryData(['todos'], (todos) =>
        todos.map((todo) => (todo.id === id ? { ...todo, completed } : todo)),
      );
      return { previous };
    },
    onError: (error, variables, onMutateResult) => {
      queryClient.setQueryData(['todos'], onMutateResult.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['todos'] }),
  });
}
```

1. **`cancelQueries`**: a background refetch that started before the click would land *after* your optimistic write and overwrite it with old data. Cancel it first.
2. **Snapshot**: read the current cache entry. Whatever `onMutate` returns is passed to `onError`, `onSuccess` and `onSettled` as `onMutateResult`.
3. **Optimistic write**: `setQueryData` with an immutable update. Every component reading `['todos']` re-renders now.
4. **Rollback** in `onError`: put the snapshot back and tell the user (toast, inline alert).
5. **Re-sync** in `onSettled` (runs on success *and* error): invalidate so the cache converges to what the server really stored. Returning the promise keeps `isPending` true until the refetch completes.

In TanStack Query 5 each callback also receives a final `context` argument with `client`, so hooks can be written without `useQueryClient`.

## Two styles of optimism

| | Via the UI (`mutation.variables`) | Via the cache (`onMutate`) |
| --- | --- | --- |
| How | render `variables` while `isPending` | write into the cache, roll back on error |
| Scope | only the component that owns the mutation | every component reading the key |
| Rollback | automatic: pending UI disappears | manual snapshot |
| Best for | appending an item to one list | toggles, reorders, deletes visible in many places |

For the UI style across components, give the mutation a `mutationKey` and read pending variables anywhere with `useMutationState({ filters: { mutationKey, status: 'pending' }, select: (mutation) => mutation.state.variables })`.

## Concurrent optimistic updates

Clicking three checkboxes quickly runs three mutations. The first `onSettled` invalidation refetches while two writes are still in flight, and the refetched list can briefly undo them ("flicker"). The fix is to invalidate only when the last related mutation settles:

```js
onSettled: () => {
  if (queryClient.isMutating({ mutationKey: ['todos'] }) === 1) {
    return queryClient.invalidateQueries({ queryKey: ['todos'] });
  }
},
```

## React 19's `useOptimistic`

For Actions (forms, `startTransition`), React offers `const [optimisticTodos, addOptimistic] = useOptimistic(todos, reducer)`. The optimistic value lives only while the Action is pending and reverts automatically when it ends; the real state must be updated by the Action itself (for example by revalidating server data). It is local to a component tree, while the cache approach updates every subscriber of a key.

## Pitfalls

- **Skipping `cancelQueries`**: rare but real flicker when a refetch races the write.
- **Mutating the cached array** instead of returning a new one: no re-render, and the snapshot is corrupted too.
- **No re-sync**: the optimistic guess becomes permanent even when the server normalized the data (trimmed titles, computed fields).
- **Optimistic creation with fake ids**: replace temporary ids with server ids on success, or keys collide.
- **Silent rollbacks**: always tell the user why the change disappeared.

## When to use it / when not to

**Be optimistic** for cheap, reversible, highly likely to succeed actions: toggles, likes, reorders, renames, deletes with undo. Users perceive the app as instant.

**Stay pessimistic** when failure is common or costly, or when the result depends on the server: payments, bookings with limited stock, anything irreversible, validations only the server can do, or creations whose server-generated data the UI needs immediately. Show a pending state instead, and disable repeat submissions.
