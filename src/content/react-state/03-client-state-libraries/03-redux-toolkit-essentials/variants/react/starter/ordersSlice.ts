import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type OrderStatus = 'pending' | 'shipped' | 'delivered';

export interface Order {
  id: string;
  customer: string;
  total: number;
  status: OrderStatus;
}

export interface OrdersState {
  items: Order[];
}

const initialState: OrdersState = {
  items: [
    { id: 'o1', customer: 'Ada Lovelace', total: 120, status: 'pending' },
    { id: 'o2', customer: 'Alan Turing', total: 340, status: 'shipped' },
    { id: 'o3', customer: 'Grace Hopper', total: 45, status: 'delivered' },
    { id: 'o4', customer: 'Linus Torvalds', total: 199, status: 'pending' },
  ],
};

export const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    orderShipped(state, action: PayloadAction<string>) {
      const order = state.items.find((item) => item.id === action.payload);
      if (order && order.status === 'pending') order.status = 'shipped';
    },
    orderArchived(state, action: PayloadAction<string>) {
      state.items = state.items.filter((item) => item.id !== action.payload);
    },
  },
});

export const { orderShipped, orderArchived } = ordersSlice.actions;
