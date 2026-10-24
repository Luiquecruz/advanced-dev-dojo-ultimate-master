import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { OrderStatus } from './ordersSlice';

export interface FiltersState {
  status: OrderStatus | 'all';
  search: string;
}

const initialState: FiltersState = { status: 'all', search: '' };

export const filtersSlice = createSlice({
  name: 'filters',
  initialState,
  reducers: {
    statusFilterChanged(state, action: PayloadAction<FiltersState['status']>) {
      state.status = action.payload;
    },
    searchChanged(state, action: PayloadAction<string>) {
      state.search = action.payload;
    },
  },
});

export const { statusFilterChanged, searchChanged } = filtersSlice.actions;
