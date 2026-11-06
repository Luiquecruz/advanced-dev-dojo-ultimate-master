import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { orderArchived } from './ordersSlice';

export interface UiState {
  selectedOrderId: string | null;
  sidebarOpen: boolean;
}

const initialState: UiState = { selectedOrderId: null, sidebarOpen: false };

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    orderSelected(state, action: PayloadAction<string>) {
      state.selectedOrderId = action.payload;
    },
    sidebarToggled(state) {
      state.sidebarOpen = !state.sidebarOpen;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(orderArchived, (state, action) => {
      if (state.selectedOrderId === action.payload) state.selectedOrderId = null;
    });
  },
});

export const { orderSelected, sidebarToggled } = uiSlice.actions;
