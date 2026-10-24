import { createSlice, nanoid } from '@reduxjs/toolkit';

export const todosSlice = createSlice({
  name: 'todos',
  initialState: { items: [] },
  reducers: {
    // TODO: todoAdded with a `reducer` that pushes action.payload
    // and a `prepare(title)` that returns { payload: { id: nanoid(), title, completed: false } }
    todoAdded(state, action) {},
    // TODO: todoToggled(state, action) flips `completed` of the todo whose id is action.payload
    todoToggled(state, action) {},
    // TODO: completedCleared(state) removes every completed todo
    completedCleared(state) {},
  },
  selectors: {
    selectTodos: (state) => state.items,
    // TODO: count the todos that are not completed
    selectRemainingCount: (state) => 0,
  },
});

export const { todoAdded, todoToggled, completedCleared } = todosSlice.actions;
export const { selectTodos, selectRemainingCount } = todosSlice.selectors;
