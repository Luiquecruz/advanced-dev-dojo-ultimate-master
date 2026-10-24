Wire **RTK Query** tag invalidation so every screen stays in sync after a write, and only the affected data refetches.

The base query (`fetchBaseQuery` pointing at `https://api.example.com/api`) and the four endpoint `query` functions are written in `api.js`; `App.jsx` already uses the generated hooks.

**`api.js`**

- Declare `tagTypes: ['Todo']`.
- `getTodos` **provides** `{ type: 'Todo', id: 'LIST' }` plus `{ type: 'Todo', id }` for every todo in the result (handle `result` being `undefined` on errors).
- `getTodo(id)` **provides** `{ type: 'Todo', id }`.
- `addTodo(title)` **invalidates** `{ type: 'Todo', id: 'LIST' }`.
- `updateTodo({ id, ...patch })` **invalidates** only `{ type: 'Todo', id }` of that todo.

**`store.js`**

- `makeStore()` returns `configureStore` with the API reducer under `todosApi.reducerPath` **and** `todosApi.middleware` concatenated to the default middleware.

Checked by the tests:

- Adding a todo with `AddTodo` (input `New todo`, button `Add`) makes it appear in `TodoList`.
- Toggling a checkbox sends a PATCH and the list shows the new value from the server.
- With `TodoList`, `TodoDetail id={2}` and `TodoDetail id={3}` mounted, updating todo 2 refetches `GET /api/todos` and `GET /api/todos/2` once each, and **never** refetches `GET /api/todos/3`.
