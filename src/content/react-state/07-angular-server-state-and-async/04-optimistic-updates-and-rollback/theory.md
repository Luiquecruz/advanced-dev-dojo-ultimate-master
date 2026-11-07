Before starting, complete the previous lessons of this module.

A user taps a checkbox and waits a second for the server before the box changes. That feels broken. An **optimistic update** applies the change in the UI immediately, sends the request, and undoes the change if the request fails. It is worth the extra code only for actions that almost always succeed and where lag hurts, such as toggles, likes and reordering.

## The four steps

1. **Snapshot** what you are about to change.
2. **Apply** the change to local state.
3. **Send** the request.
4. On failure, **roll back** from the snapshot and tell the user. On success, optionally reconcile with the server's response.

```ts
async toggle(id: number) {
  const before = this.todos().find((todo) => todo.id === id);
  if (!before) return;
  this.error.set(null);
  this.patch(id, { completed: !before.completed });          // apply
  try {
    await this.save({ ...before, completed: !before.completed }); // send
  } catch {
    this.patch(id, { completed: before.completed });         // roll back
    this.error.set('Could not save the change.');
  }
}
```

## Roll back narrowly

Restoring the **whole list** from a snapshot is wrong when other changes happened meanwhile: you would erase a second toggle that succeeded. Roll back only the field of the entity you changed. For rapid changes to the same item, either serialize them (`concatMap`) or keep a per-item sequence number and ignore results of older attempts.

## Pessimistic versus optimistic

| | Pessimistic | Optimistic |
| --- | --- | --- |
| UI changes | after the server confirms | immediately |
| Failure | nothing to undo | roll back and explain |
| Code | simple | snapshot, rollback, ordering |
| Use for | payments, irreversible actions, server-computed results | toggles, likes, drag-and-drop |

Do not use an optimistic update when the server decides the result (a price, a generated id, validation that often fails). Show a pending state instead.

## Synchronizing with a cache

If a query cache or a `resource` holds the same list, an optimistic change must touch that cache too. With `resource`, write the new value with `set` or `update` (status `local`); with a query library, write the query data and invalidate on settle. The rule from the first lesson still holds: one owner. Do not update the store and also a second copy of the list.

## Pending and error feedback

Optimistic does not mean silent. Mark the item as pending (a subtle style), and when a rollback happens explain why and offer a retry. A change that quietly snaps back is a bug in the user's eyes.

## Common mistakes

- Restoring the entire list on failure and erasing unrelated successful changes.
- Mutating the existing object instead of replacing it, which breaks the snapshot.
- Forgetting to clear a previous error, so a stale message stays visible.
- Applying an optimistic update to server-computed results.
- Never re-fetching afterwards, leaving the client drifting from the server.

## When to choose it

Choose it for high-success, low-risk, reversible actions where latency is visible. Keep the rollback path as well tested as the success path.
