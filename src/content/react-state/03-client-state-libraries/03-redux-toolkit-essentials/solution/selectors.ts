import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from './store';

export const selectOrders = (state: RootState) => state.orders.items;
export const selectStatusFilter = (state: RootState) => state.filters.status;
export const selectSearch = (state: RootState) => state.filters.search;

export const selectVisibleOrders = createSelector([selectOrders, selectStatusFilter, selectSearch], (orders, status, search) =>
  orders.filter(
    (order) => (status === 'all' || order.status === status) && order.customer.toLowerCase().includes(search.toLowerCase()),
  ),
);

export const selectOrderStats = createSelector([selectOrders], (orders) => ({
  count: orders.length,
  revenue: orders.reduce((sum, order) => sum + order.total, 0),
  pending: orders.filter((order) => order.status === 'pending').length,
}));

export const selectSelectedOrder = (state: RootState) =>
  state.orders.items.find((order) => order.id === state.ui.selectedOrderId) ?? null;
