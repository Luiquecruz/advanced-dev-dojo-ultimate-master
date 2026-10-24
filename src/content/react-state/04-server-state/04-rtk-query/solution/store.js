import { configureStore } from '@reduxjs/toolkit';
import { todosApi } from './api';

export function makeStore() {
  return configureStore({
    reducer: { [todosApi.reducerPath]: todosApi.reducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(todosApi.middleware),
  });
}
