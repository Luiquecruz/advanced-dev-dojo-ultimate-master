const { Provider } = require('react-redux');

const files = () => ({
  store: modules['store.ts'],
  selectors: modules['selectors.ts'],
  orders: modules['ordersSlice.ts'],
  filters: modules['filtersSlice.ts'],
  ui: modules['uiSlice.ts'],
});

test('hooks.ts creates pre-typed hooks with withTypes, and components use them', () => {
  expect(sources['hooks.ts']).toMatch(/useDispatch\.withTypes\s*</);
  expect(sources['hooks.ts']).toMatch(/useSelector\.withTypes\s*</);
  expect(sources['App.tsx']).not.toMatch(/\buseSelector\b|\buseDispatch\b/);
});

test('selectVisibleOrders filters by status and search and is memoized', () => {
  const { store: storeFile, selectors, filters, ui } = files();
  const store = storeFile.makeStore();
  const first = selectors.selectVisibleOrders(store.getState());
  expect(selectors.selectVisibleOrders(store.getState())).toBe(first);
  store.dispatch(ui.sidebarToggled());
  expect(selectors.selectVisibleOrders(store.getState())).toBe(first);
  store.dispatch(filters.statusFilterChanged('pending'));
  store.dispatch(filters.searchChanged('li'));
  expect(selectors.selectVisibleOrders(store.getState()).map((order) => order.customer)).toEqual(['Linus Torvalds']);
});

test('selectOrderStats returns the same object until the orders change', () => {
  const { store: storeFile, selectors, filters, orders } = files();
  const store = storeFile.makeStore();
  const stats = selectors.selectOrderStats(store.getState());
  expect(stats).toEqual({ count: 4, revenue: 704, pending: 2 });
  store.dispatch(filters.searchChanged('ada'));
  expect(selectors.selectOrderStats(store.getState())).toBe(stats);
  store.dispatch(orders.orderShipped('o1'));
  expect(selectors.selectOrderStats(store.getState())).toEqual({ count: 4, revenue: 704, pending: 1 });
});

test('OrderList does not re-render when unrelated state changes (measured with <Profiler>)', async () => {
  const { OrderList, Toolbar } = mod;
  const store = files().store.makeStore();
  const onRender = fn();
  render(
    <Provider store={store}>
      <Toolbar />
      <React.Profiler id="list" onRender={onRender}>
        <OrderList />
      </React.Profiler>
    </Provider>,
  );
  await user.click(screen.getByRole('button', { name: 'Toggle sidebar' }));
  await user.click(screen.getByRole('button', { name: 'Toggle sidebar' }));
  expect(onRender).toHaveBeenCalledTimes(1);
  await user.selectOptions(screen.getByLabelText('Status'), 'shipped');
  expect(within(screen.getByRole('list', { name: 'Orders' })).getAllByRole('listitem')).toHaveLength(1);
  expect(onRender).toHaveBeenCalledTimes(2);
});

test('archiving the selected order clears the selection in the ui slice (extraReducers)', async () => {
  const { store: storeFile, orders, ui } = files();
  const store = storeFile.makeStore();
  store.dispatch(ui.orderSelected('o2'));
  store.dispatch(orders.orderArchived('o3'));
  expect(store.getState().ui.selectedOrderId).toBe('o2');
  store.dispatch(orders.orderArchived('o2'));
  expect(store.getState().ui.selectedOrderId).toBeNull();
  const App = mod.default;
  render(<App />);
  await user.click(screen.getByRole('button', { name: 'Grace Hopper' }));
  expect(screen.getByTestId('details')).toHaveTextContent('Grace Hopper: $45 (delivered)');
  await user.click(screen.getByRole('button', { name: 'Archive Grace Hopper' }));
  expect(screen.getByTestId('details')).toHaveTextContent('No order selected');
  expect(screen.getByTestId('stats')).toHaveTextContent('3 orders · $659 · 2 pending');
});

test('makeStore accepts a preloaded state for tests', () => {
  const store = files().store.makeStore({ orders: { items: [{ id: 'x1', customer: 'Margaret Hamilton', total: 999, status: 'pending' }] } });
  expect(store.getState().orders.items).toHaveLength(1);
  expect(store.getState().filters).toEqual({ status: 'all', search: '' });
  render(
    <Provider store={store}>
      <mod.OrderStats />
    </Provider>,
  );
  expect(screen.getByTestId('stats')).toHaveTextContent('1 orders · $999 · 1 pending');
});
