Add and toggle todos with **`useMutation`** and keep the `['todos']` cache in sync.

The request helpers `fetchTodos`, `createTodo(title)` and `updateTodo({ id, completed })` are already written. `TodoList` already loads `['todos']` with `useQuery`.

**`AddTodoForm`**

- Create a mutation with `mutationFn: createTodo`.
- Submitting the form (input labelled `New todo`) calls `mutate(title)`.
- `onSuccess`: clear the input and **invalidate** the todos query with `queryClient.invalidateQueries({ queryKey: ['todos'] })`, so the list refetches and shows the new todo.
- While the mutation is pending the submit button is **disabled** and its text is `Adding...`; otherwise it reads `Add todo`.

**`TodoList`**

- Create a `toggle` mutation with `mutationFn: updateTodo`.
- Each checkbox (labelled with the todo title) calls `toggle.mutate({ id: todo.id, completed: !todo.completed })`.
- `onSuccess`: write the server response into the cache with `queryClient.setQueryData(['todos'], ...)`, replacing the todo with the same `id` immutably.

`TodosPage` renders both; tests wrap it in their own `QueryClientProvider`.
