`const queryClient = useQueryClient();` is already there. Create the mutation with `useMutation({ mutationFn: createTodo, onSuccess: () => { ... } })` and call `addTodo.mutate(title)` in `handleSubmit`.
---
Invalidate with `queryClient.invalidateQueries({ queryKey: ['todos'] })`. Returning that promise from `onSuccess` keeps the button disabled until the refetch finishes.
---
The button: `<button type="submit" disabled={addTodo.isPending}>{addTodo.isPending ? 'Adding...' : 'Add todo'}</button>`.
---
For the toggle: `onSuccess: (updated) => queryClient.setQueryData(['todos'], (todos) => todos.map((todo) => (todo.id === updated.id ? updated : todo)))`, and on the checkbox replace `readOnly` with an `onChange` calling `toggle.mutate(...)`.
