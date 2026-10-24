import { useState } from 'react';
import { Provider } from 'react-redux';
import { searchChanged, statusFilterChanged, type FiltersState } from './filtersSlice';
import { useAppDispatch, useAppSelector } from './hooks';
import { orderArchived, orderShipped } from './ordersSlice';
import { selectOrderStats, selectSearch, selectSelectedOrder, selectStatusFilter, selectVisibleOrders } from './selectors';
import { makeStore } from './store';
import { orderSelected, sidebarToggled } from './uiSlice';

export function Toolbar() {
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectStatusFilter);
  const search = useAppSelector(selectSearch);
  return (
    <div role="toolbar">
      <select
        aria-label="Status"
        value={status}
        onChange={(event) => dispatch(statusFilterChanged(event.target.value as FiltersState['status']))}
      >
        <option value="all">All</option>
        <option value="pending">Pending</option>
        <option value="shipped">Shipped</option>
        <option value="delivered">Delivered</option>
      </select>
      <input aria-label="Search customer" value={search} onChange={(event) => dispatch(searchChanged(event.target.value))} />
      <button onClick={() => dispatch(sidebarToggled())}>Toggle sidebar</button>
    </div>
  );
}

export function OrderList() {
  const dispatch = useAppDispatch();
  const orders = useAppSelector(selectVisibleOrders);
  return (
    <ul aria-label="Orders">
      {orders.map((order) => (
        <li key={order.id}>
          <button onClick={() => dispatch(orderSelected(order.id))}>{order.customer}</button> {order.status}
          {order.status === 'pending' && <button onClick={() => dispatch(orderShipped(order.id))}>Ship {order.customer}</button>}
          <button onClick={() => dispatch(orderArchived(order.id))}>Archive {order.customer}</button>
        </li>
      ))}
    </ul>
  );
}

export function OrderStats() {
  const { count, revenue, pending } = useAppSelector(selectOrderStats);
  return (
    <p data-testid="stats">
      {count} orders · ${revenue} · {pending} pending
    </p>
  );
}

export function OrderDetails() {
  const order = useAppSelector(selectSelectedOrder);
  return <p data-testid="details">{order ? `${order.customer}: $${order.total} (${order.status})` : 'No order selected'}</p>;
}

function Sidebar() {
  const open = useAppSelector((state) => state.ui.sidebarOpen);
  return open ? <aside>Saved views</aside> : null;
}

export default function App() {
  const [store] = useState(() => makeStore());
  return (
    <Provider store={store}>
      <Toolbar />
      <Sidebar />
      <OrderStats />
      <OrderList />
      <OrderDetails />
    </Provider>
  );
}
