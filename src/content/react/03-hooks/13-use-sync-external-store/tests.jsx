test('createStore notifies subscribers and supports updater functions', () => {
  const store = mod.createStore({ count: 0 });
  const listener = fn();
  const unsubscribe = store.subscribe(listener);
  store.setState({ count: 1 });
  store.setState((state) => ({ count: state.count + 1 }));
  expect(store.getState()).toEqual({ count: 2 });
  expect(listener).toHaveBeenCalledTimes(2);
  unsubscribe();
  store.setState({ count: 3 });
  expect(listener).toHaveBeenCalledTimes(2);
});

test('setState with the same value does not notify', () => {
  const state = { count: 0 };
  const store = mod.createStore(state);
  const listener = fn();
  store.subscribe(listener);
  store.setState(state);
  store.setState((current) => current);
  expect(listener).not.toHaveBeenCalled();
});

test('useStore re-renders components when the store changes', async () => {
  const App = mod.default;
  render(<App />);
  expect(screen.getByText('Cart: 0')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Add to cart' }));
  await user.click(screen.getByRole('button', { name: 'Add to cart' }));
  expect(screen.getByText('Cart: 2')).toBeInTheDocument();
});

test('a component only re-renders when its selected slice changes', () => {
  const { createStore, useStore } = mod;
  const store = createStore({ items: 0, coupon: '' });
  const renders = fn();
  function Badge() {
    const items = useStore(store, (state) => state.items);
    renders();
    return <p>Items: {items}</p>;
  }
  render(<Badge />);
  act(() => store.setState((state) => ({ ...state, coupon: 'DOJO10' })));
  expect(renders).toHaveBeenCalledTimes(1);
  act(() => store.setState((state) => ({ ...state, items: 5 })));
  expect(screen.getByText('Items: 5')).toBeInTheDocument();
  expect(renders).toHaveBeenCalledTimes(2);
});

test('unsubscribes when the component unmounts', () => {
  const { createStore, useStore } = mod;
  const store = createStore({ items: 0 });
  const active = new Set();
  const subscribe = store.subscribe;
  store.subscribe = (listener) => {
    active.add(listener);
    const unsubscribe = subscribe(listener);
    return () => {
      active.delete(listener);
      unsubscribe();
    };
  };
  function Badge() {
    const items = useStore(store, (state) => state.items);
    return <p>Items: {items}</p>;
  }
  const { unmount } = render(<Badge />);
  expect(active.size).toBe(1);
  unmount();
  expect(active.size).toBe(0);
});

test('uses useSyncExternalStore', () => {
  expect(source).toMatch(/useSyncExternalStore\s*\(/);
});
