import type { RootState } from './store';

export const selectOrders = (state: RootState) => state.orders.items;
export const selectStatusFilter = (state: RootState) => state.filters.status;
export const selectSearch = (state: RootState) => state.filters.search;

// TODO: memoize with createSelector so the same inputs return the same array
export const selectVisibleOrders = (state: RootState) =>
  selectOrders(state).filter(
    (order) =>
      (selectStatusFilter(state) === 'all' || order.status === selectStatusFilter(state)) &&
      order.customer.toLowerCase().includes(selectSearch(state).toLowerCase()),
  );

// TODO: memoize with createSelector so the same orders return the same object
export const selectOrderStats = (state: RootState) => ({
  count: state.orders.items.length,
  revenue: state.orders.items.reduce((sum, order) => sum + order.total, 0),
  pending: state.orders.items.filter((order) => order.status === 'pending').length,
});

export const selectSelectedOrder = (state: RootState) =>
  state.orders.items.find((order) => order.id === state.ui.selectedOrderId) ?? null;
