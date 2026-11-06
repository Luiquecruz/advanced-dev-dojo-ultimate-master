import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { filtersSlice } from './filtersSlice';
import { ordersSlice } from './ordersSlice';
import { uiSlice } from './uiSlice';

const rootReducer = combineReducers({
  orders: ordersSlice.reducer,
  filters: filtersSlice.reducer,
  ui: uiSlice.reducer,
});

export type RootState = ReturnType<typeof rootReducer>;

export function makeStore(preloadedState?: Partial<RootState>) {
  return configureStore({ reducer: rootReducer, preloadedState });
}

export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore['dispatch'];
