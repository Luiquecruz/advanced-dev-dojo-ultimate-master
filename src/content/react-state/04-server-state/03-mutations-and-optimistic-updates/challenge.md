Make the todo list feel instant with **optimistic updates** that roll back on failure.

The request helpers (`fetchTodos`, `updateTodo({ id, completed })`, `deleteTodo(id)`), the key `todosKey = ['todos']` and the `TodoList` markup are written. Today both mutations are **pessimistic**: the UI changes only after the server answers.

**`useToggleTodo()`** and **`useDeleteTodo()`** (export both) must implement the full optimistic lifecycle:

- `onMutate`: `await queryClient.cancelQueries({ queryKey: ['todos'] })`, snapshot the cache with `getQueryData`, write the optimistic result with `setQueryData` (toggle: set `completed` of the todo with that `id`; delete: remove it), and return `{ previous }`.
- `onError`: restore `previous` into the `['todos']` cache.
- `onSettled`: return `queryClient.invalidateQueries({ queryKey: ['todos'] })`.

**`TodoList`**

- When either mutation is in the error state, render `<p role="alert">Could not save your change</p>`.

Checked by the tests (requests are slowed down or forced to fail):

- A checkbox (labelled with the todo title) is checked **before** the PATCH response arrives; a failed PATCH unchecks it again.
- `Delete {title}` removes the row **before** the DELETE response arrives; a failed DELETE brings it back.
- `cancelQueries` and `invalidateQueries` are called with `queryKey: ['todos']`.
