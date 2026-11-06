import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

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
  // TODO: respond to orderArchived from the orders slice: clear selectedOrderId when the archived order is selected
});

export const { orderSelected, sidebarToggled } = uiSlice.actions;
