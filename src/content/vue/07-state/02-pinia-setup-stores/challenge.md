Write a todo list backed by a Pinia **setup store** that loads its data from the API.

**`store.ts`** — `useTodosStore` (id `"todos"`) already declares the `todos`, `loading` and `error` refs. Complete it:

1. `remaining`: a `computed` with the number of todos whose `completed` is `false`.
2. `fetchTodos()`: an async action that sets `loading` to `true`, clears `error`, requests `GET /api/todos` and stores the result in `todos`. When the response is not OK (or the request throws), set `error` to `"Failed to load todos"`. Always set `loading` back to `false`.
3. `toggle(id)`: flips `completed` on the todo with that `id`.
4. `$reset()`: setup stores do not get one for free. Write it so it restores `todos` to `[]`, `loading` to `false` and `error` to `null`, and **return it** from the setup function together with everything else.

**`App.vue`**

1. Call `fetchTodos()` when the component mounts.
2. Bind each checkbox's `checked` state to `todo.completed` and call `toggle(todo.id)` on `change`.

The template already shows `Loading…`, the error in `role="alert"`, the list and `N remaining`.
