## Queries read, mutations write

`useQuery` is for reading. Creating, updating or deleting data on the server is a **mutation**. `useMutation` gives you a `mutate` function plus the state of the latest call:

```jsx
import { useMutation } from '@tanstack/react-query';

const addTodo = useMutation({
  mutationFn: async (title) => {
    const response = await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    if (!response.ok) throw new Error('Could not save');
    return response.json();
  },
});

addTodo.mutate('Write docs');
addTodo.isPending;
addTodo.isError;
addTodo.error;
addTodo.data;
addTodo.variables;
```

Unlike queries, mutations do **not** run automatically: they run when you call `mutate(variables)`.

- `mutate(variables, { onSuccess, onError, onSettled })` fires and forgets; errors are reported through state, never thrown.
- `mutateAsync(variables)` returns a promise you can `await`, but then **you** must catch errors.

## The cache does not know you changed something

After a successful `POST /api/todos`, the `['todos']` query still holds the old list. You have to tell the cache. Two strategies:

### 1. Invalidate and refetch

```jsx
import { useMutation, useQueryClient } from '@tanstack/react-query';

function AddTodo() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: createTodo,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todos'] }),
  });
}
```

`invalidateQueries` marks matching queries as stale and refetches the ones currently rendered. Matching is by **prefix**: `{ queryKey: ['todos'] }` also invalidates `['todos', 1]` and `['todos', { done: true }]`. Returning the promise from `onSuccess` keeps the mutation pending until the refetch finishes, so the button stays disabled until the list is up to date.

This is the simplest and safest choice: the server stays the source of truth.

### 2. Write the response into the cache

When the server returns the updated entity, you can skip the refetch with `setQueryData`:

```jsx
onSuccess: (updated) => {
  queryClient.setQueryData(['todos'], (todos) =>
    todos.map((todo) => (todo.id === updated.id ? updated : todo)),
  );
},
```

Always update **immutably**: return a new array, never mutate the cached one.

## Callbacks

| Callback | Runs | Typical use |
| --- | --- | --- |
| `onMutate(variables)` | before `mutationFn` | optimistic update, return rollback data |
| `onSuccess(data, variables, onMutateResult)` | after success | invalidate or update cache |
| `onError(error, variables, onMutateResult)` | after failure | roll back, show a toast |
| `onSettled(data, error, ...)` | always | invalidate in both cases |

In TanStack Query 5 each callback also receives a final `context` argument with the `client`, so `context.client.invalidateQueries(...)` works without `useQueryClient`.

## Optimistic updates

Users should not wait for the network to see a checkbox toggle. Two ways:

**Via the UI** (simplest): render `mutation.variables` while `mutation.isPending`.

```jsx
{mutation.isPending && <li style={{ opacity: 0.5 }}>{mutation.variables}</li>}
```

**Via the cache**: update the cache in `onMutate`, roll back in `onError`, and re-sync in `onSettled`.

```jsx
useMutation({
  mutationFn: toggleTodo,
  onMutate: async (todo) => {
    await queryClient.cancelQueries({ queryKey: ['todos'] });
    const previous = queryClient.getQueryData(['todos']);
    queryClient.setQueryData(['todos'], (todos) =>
      todos.map((item) => (item.id === todo.id ? { ...item, completed: !item.completed } : item)),
    );
    return { previous };
  },
  onError: (error, todo, onMutateResult) => queryClient.setQueryData(['todos'], onMutateResult.previous),
  onSettled: () => queryClient.invalidateQueries({ queryKey: ['todos'] }),
});
```

React 19's `useOptimistic` offers the same idea for form actions.

## The legacy way

Before query libraries, apps dispatched `ADD_TODO_REQUEST`, `ADD_TODO_SUCCESS` and `ADD_TODO_FAILURE` from thunks, then either refetched manually or patched a Redux slice by hand, and every screen showing todos had to be kept in sync. Cache invalidation by key replaces all of that with one line.

## Pitfalls

- **Forgetting to invalidate**: the mutation succeeds but the list never changes.
- **Invalidating the wrong key**: `['todo']` does not match `['todos']`.
- **Double submits**: disable the submit button while `isPending`.
- **Mutating cached arrays** with `push`: components will not re-render. Return new arrays.
- **Using `mutateAsync` without `try/catch`**: unhandled promise rejections.
