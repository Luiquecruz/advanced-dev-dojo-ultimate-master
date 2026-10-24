The adapter shapes the state as `{ ids, entities, ...extra }`. `getInitialState({ status: 'idle', error: null })` adds your own fields, and `todosAdapter.setAll(state, action.payload)` replaces the collection inside a case reducer.
---
The third argument of `createAsyncThunk` is an options object: `{ condition: (_, { getState }) => getState().todos.status !== 'loading' }`. Returning `false` cancels the thunk before `pending` is dispatched.
---
`extraReducers: (builder) => { builder.addCase(fetchTodos.pending, ...).addCase(fetchTodos.fulfilled, ...).addCase(fetchTodos.rejected, (state, action) => { state.status = 'failed'; state.error = action.error.message; }); }`.
---
`listenerMiddleware.startListening({ actionCreator: todoToggled, effect: async (action, listenerApi) => { const todo = selectTodoById(listenerApi.getState(), action.payload); ... } })` and in the store `middleware: (getDefaultMiddleware) => getDefaultMiddleware().prepend(listenerMiddleware.middleware)`.
