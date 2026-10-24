import { createSlice, nanoid } from '@reduxjs/toolkit';

export const todosSlice = createSlice({
  name: 'todos',
  initialState: { items: [] },
  reducers: {
    todoAdded: {
      reducer(state, action) {
        state.items.push(action.payload);
      },
      prepare(title) {
        return { payload: { id: nanoid(), title, completed: false } };
      },
    },
    todoToggled(state, action) {
      const todo = state.items.find((item) => item.id === action.payload);
      todo.completed = !todo.completed;
    },
    completedCleared(state) {
      state.items = state.items.filter((item) => !item.completed);
    },
  },
  selectors: {
    selectTodos: (state) => state.items,
    selectRemainingCount: (state) => state.items.filter((item) => !item.completed).length,
  },
});

export const { todoAdded, todoToggled, completedCleared } = todosSlice.actions;
export const { selectTodos, selectRemainingCount } = todosSlice.selectors;
