## Three problems of large Redux apps

As a Redux app grows, three problems appear: collections stored as arrays become slow and awkward to update, async flows spread loading flags everywhere, and side effects ("when X happens, also do Y") leak into components. RTK answers each with one API: `createEntityAdapter`, `createAsyncThunk` and the listener middleware.

## Normalized collections with `createEntityAdapter`

Storing collections as `{ ids: [], entities: {} }` gives O(1) lookups by id, one place per entity (no duplicates across lists) and cheap updates of a single item.

```js
export const todosAdapter = createEntityAdapter();

const initialState = todosAdapter.getInitialState({ status: 'idle', error: null });
```

The adapter provides **reducer helpers** (`addOne`, `setAll`, `upsertMany`, `updateOne({ id, changes })`, `removeOne`...) usable inside case reducers, and **memoized selectors**:

```js
export const { selectAll: selectAllTodos, selectById: selectTodoById, selectTotal: selectTodoCount } =
  todosAdapter.getSelectors((state) => state.todos);
```

Options: `selectId` for entities whose key is not `id`, and `sortComparer` to keep `ids` sorted.

## Async flows with `createAsyncThunk`

A thunk created with `createAsyncThunk` dispatches `pending`, then `fulfilled` (with the returned value) or `rejected` (with the thrown error serialized into `action.error`).

```js
export const fetchTodos = createAsyncThunk(
  'todos/fetchTodos',
  async () => {
    const response = await fetch('/api/todos');
    if (!response.ok) throw new Error('Failed to load todos');
    return response.json();
  },
  { condition: (_, { getState }) => getState().todos.status !== 'loading' },
);
```

- `fetch` does not reject on HTTP errors: check `response.ok` and throw yourself.
- `condition` runs before anything is dispatched. Returning `false` cancels the thunk: no request, no actions. This deduplicates calls from StrictMode double effects or several components mounting at once.
- Handle the three actions in `extraReducers` with `builder.addCase(fetchTodos.fulfilled, ...)`.
- `rejectWithValue` returns a typed error payload (validation errors from the server); `thunkAPI.signal` lets you abort.

For **server data** like this, RTK Query (later in this track) replaces hand-written thunks entirely. Thunks remain the tool for client-side async workflows.

## Reactive side effects with the listener middleware

The listener middleware runs **effects in response to actions**, after the reducers have updated the state. It is RTK's lightweight answer to sagas and observables.

```js
export const listenerMiddleware = createListenerMiddleware();

listenerMiddleware.startListening({
  actionCreator: todoToggled,
  effect: async (action, listenerApi) => {
    const todo = selectTodoById(listenerApi.getState(), action.payload);
    const response = await fetch(`/api/todos/${todo.id}`, { method: 'PATCH', body: JSON.stringify({ completed: todo.completed }) });
    if (!response.ok) {
      listenerApi.dispatch(todoToggleReverted(todo.id));
      listenerApi.dispatch(notificationAdded(`Could not save "${todo.title}"`));
    }
  },
});

configureStore({
  reducer,
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().prepend(listenerMiddleware.middleware),
});
```

Why it scales:

- The component only dispatches `todoToggled`; persistence, analytics, notifications and undo are added as listeners without touching it.
- `getState()` in the effect sees the **new** state; `getOriginalState()` the state before the action.
- Match with `actionCreator`, `type`, `matcher: isAnyOf(a, b)` or a `predicate(action, current, previous)`.
- Flow control: `cancelActiveListeners()` + `await delay(500)` gives debouncing (autosave), `condition()` and `take()` wait for future actions, `fork()` starts child tasks.
- Revert with a **separate** action (`todoToggleReverted`): dispatching `todoToggled` again would trigger the listener again.

This is an **optimistic update**: the UI changes first, the server confirms later, and failure rolls back with a visible message.

## When to use it / when not to

Use entity adapters for any collection that is looked up or updated by id; `createAsyncThunk` for client-driven async workflows (multi-step processes, uploads, orchestrating several calls); listeners for cross-cutting reactions (autosave, analytics, syncing to storage, notifications, websockets). Do not hand-write thunks for plain fetching and caching of server data (use RTK Query or TanStack Query), do not put side effects in reducers, and do not use listeners to "sync" one slice from another when `extraReducers` or a selector can derive it.
