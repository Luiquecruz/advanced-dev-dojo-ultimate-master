import { configureStore } from '@reduxjs/toolkit';
import { listenerMiddleware } from './listeners';
import { notificationsReducer } from './notificationsSlice';
import { todosReducer } from './todosSlice';

export function makeStore() {
  return configureStore({
    reducer: { todos: todosReducer, notifications: notificationsReducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().prepend(listenerMiddleware.middleware),
  });
}
