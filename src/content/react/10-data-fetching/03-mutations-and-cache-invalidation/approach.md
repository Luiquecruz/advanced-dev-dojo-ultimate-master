1. In `AddTodoForm`, create the mutation with `useMutation` and `mutationFn: createTodo`; mutations only run when you call `mutate`.
2. Call `addTodo.mutate(title)` from the submit handler after `preventDefault()`.
3. In `onSuccess`, reset the input and invalidate `['todos']`. The list component is subscribed to that key, so it refetches and re-renders with the server's new list.
4. Drive the button from `addTodo.isPending`: disabled and labelled `Adding...` while the request runs, which also prevents double submits.
5. In `TodoList`, create the toggle mutation. Since the PATCH response contains the updated todo, use `setQueryData` to patch the cached array instead of refetching.
6. Wire the checkbox `onChange` to `toggle.mutate` with the new `completed` value.
