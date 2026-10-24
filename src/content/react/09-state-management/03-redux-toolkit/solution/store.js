import { configureStore } from '@reduxjs/toolkit';
import { todosSlice } from './todosSlice';

export function makeStore() {
  return configureStore({ reducer: { todos: todosSlice.reducer } });
}
