import { createAsyncThunk, createEntityAdapter, createSlice } from '@reduxjs/toolkit';

// TODO: create the adapter with createEntityAdapter()
export const todosAdapter = null;

export const fetchTodos = createAsyncThunk('todos/fetchTodos', async () => {
  // TODO: GET /api/todos, throw new Error('Failed to load todos') when the response is not ok, return the JSON
  // TODO: add a third argument { condition } that skips the thunk while state.todos.status is 'loading'
  return [];
});

const todosSlice = createSlice({
  name: 'todos',
  // TODO: use todosAdapter.getInitialState({ status: 'idle', error: null })
  initialState: { ids: [], entities: {}, status: 'idle', error: null },
  reducers: {
    todoToggled(state, action) {
      const todo = state.entities[action.payload];
      if (todo) todo.completed = !todo.completed;
    },
    todoToggleReverted(state, action) {
      const todo = state.entities[action.payload];
      if (todo) todo.completed = !todo.completed;
    },
  },
  // TODO: extraReducers for fetchTodos.pending ('loading'), fulfilled ('succeeded' + setAll) and rejected ('failed' + error message)
});

export const todosReducer = todosSlice.reducer;
export const { todoToggled, todoToggleReverted } = todosSlice.actions;

// TODO: replace with selectAll, selectById and selectTotal from todosAdapter.getSelectors((state) => state.todos)
export const selectAllTodos = (state) => state.todos.ids.map((id) => state.todos.entities[id]);
export const selectTodoById = (state, id) => state.todos.entities[id];
export const selectTodoCount = (state) => state.todos.ids.length;

export const selectRemainingCount = (state) => selectAllTodos(state).filter((todo) => !todo.completed).length;
