import { configureStore } from '@reduxjs/toolkit';
import { todosApi } from './api';

export function makeStore() {
  return configureStore({
    reducer: { [todosApi.reducerPath]: todosApi.reducer },
    // TODO: add todosApi.middleware to the default middleware (it runs cache lifetimes and tag invalidation)
  });
}
