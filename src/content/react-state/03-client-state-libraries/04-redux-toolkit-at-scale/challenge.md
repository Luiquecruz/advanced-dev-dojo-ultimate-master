Finish the todo feature with the three RTK tools for scale. `App.jsx` and `notificationsSlice.js` are done.

**`todosSlice.js`**

1. `todosAdapter`: created with `createEntityAdapter()`. The slice's initial state is `todosAdapter.getInitialState({ status: 'idle', error: null })`.
2. `fetchTodos`: `createAsyncThunk('todos/fetchTodos', ...)` that fetches `GET /api/todos`, throws `new Error('Failed to load todos')` when the response is not ok, and returns the JSON. Add a **`condition`** that cancels the thunk while `state.todos.status` is `'loading'`.
3. `extraReducers`:
   - `pending` → `status: 'loading'`, `error: null`
   - `fulfilled` → `status: 'succeeded'` and `todosAdapter.setAll`
   - `rejected` → `status: 'failed'`, `error: action.error.message`
4. Export `selectAllTodos`, `selectTodoById` and `selectTodoCount` from `todosAdapter.getSelectors((state) => state.todos)`.

**`listeners.js`**: register a listener on `todoToggled` (the toggle is applied optimistically by the reducer). The effect reads the toggled todo from the **new** state and sends `PATCH /api/todos/{id}` with the JSON body `{ completed }`. If the request fails (not ok), dispatch `todoToggleReverted(id)` and `notificationAdded('Could not save "{title}"')`.

**`store.js`**: prepend `listenerMiddleware.middleware` to the default middleware.
