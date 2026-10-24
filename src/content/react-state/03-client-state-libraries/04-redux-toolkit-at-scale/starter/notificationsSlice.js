import { createSlice, nanoid } from '@reduxjs/toolkit';

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: [],
  reducers: {
    notificationAdded: {
      reducer(state, action) {
        state.push(action.payload);
      },
      prepare(message) {
        return { payload: { id: nanoid(), message } };
      },
    },
    notificationDismissed(state, action) {
      return state.filter((notification) => notification.id !== action.payload);
    },
  },
});

export const notificationsReducer = notificationsSlice.reducer;
export const { notificationAdded, notificationDismissed } = notificationsSlice.actions;
