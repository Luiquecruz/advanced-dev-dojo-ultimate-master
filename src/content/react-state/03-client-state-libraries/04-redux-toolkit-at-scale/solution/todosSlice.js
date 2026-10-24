import { createAsyncThunk, createEntityAdapter, createSlice } from '@reduxjs/toolkit';

export const todosAdapter = createEntityAdapter();

export const fetchTodos = createAsyncThunk(
  'todos/fetchTodos',
  async () => {
    const response = await fetch('/api/todos');
    if (!response.ok) {
      throw new Error('Failed to load todos');
    }
    return response.json();
  },
  {
    condition: (_, { getState }) => getState().todos.status !== 'loading',
  },
);

const todosSlice = createSlice({
  name: 'todos',
  initialState: todosAdapter.getInitialState({ status: 'idle', error: null }),
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
  extraReducers: (builder) => {
    builder
      .addCase(fetchTodos.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchTodos.fulfilled, (state, action) => {
        state.status = 'succeeded';
        todosAdapter.setAll(state, action.payload);
      })
      .addCase(fetchTodos.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      });
  },
});

export const todosReducer = todosSlice.reducer;
export const { todoToggled, todoToggleReverted } = todosSlice.actions;

export const {
  selectAll: selectAllTodos,
  selectById: selectTodoById,
  selectTotal: selectTodoCount,
} = todosAdapter.getSelectors((state) => state.todos);

export const selectRemainingCount = (state) => selectAllTodos(state).filter((todo) => !todo.completed).length;
