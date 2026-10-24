const store = () => modules['store.js'].useCartStore;

test('addItem adds a product with quantity 1 and increments it when added again', () => {
  const useCartStore = store();
  useCartStore.getState().addItem({ id: 1, name: 'Keyboard', price: 120 });
  useCartStore.getState().addItem({ id: 1, name: 'Keyboard', price: 120 });
  useCartStore.getState().addItem({ id: 2, name: 'Mouse', price: 45 });
  expect(useCartStore.getState().items).toEqual([
    { id: 1, name: 'Keyboard', price: 120, quantity: 2 },
    { id: 2, name: 'Mouse', price: 45, quantity: 1 },
  ]);
});

test('removeItem removes one product and clear empties the cart', () => {
  const useCartStore = store();
  const { addItem, removeItem, clear } = useCartStore.getState();
  addItem({ id: 1, name: 'Keyboard', price: 120 });
  addItem({ id: 2, name: 'Mouse', price: 45 });
  removeItem(1);
  expect(useCartStore.getState().items.map((item) => item.id)).toEqual([2]);
  clear();
  expect(useCartStore.getState().items).toEqual([]);
});

test('selectCount and selectTotal derive values from the items', () => {
  const { selectCount, selectTotal } = modules['store.js'];
  const state = {
    items: [
      { id: 1, name: 'Keyboard', price: 120, quantity: 2 },
      { id: 2, name: 'Mouse', price: 45, quantity: 1 },
    ],
  };
  expect(selectCount(state)).toBe(3);
  expect(selectTotal(state)).toBe(285);
});

test('clicking the "Add" buttons updates the CartSummary rendered elsewhere', async () => {
  const App = mod.default;
  render(<App />);
  await user.click(screen.getByRole('button', { name: 'Add Keyboard' }));
  await user.click(screen.getByRole('button', { name: 'Add Keyboard' }));
  await user.click(screen.getByRole('button', { name: 'Add Mouse' }));
  expect(screen.getByTestId('cart-count').textContent).toBe('Items: 3');
  expect(screen.getByTestId('cart-total').textContent).toBe('Total: $285');
});

test('"Clear cart" resets the summary', async () => {
  const App = mod.default;
  render(<App />);
  await user.click(screen.getByRole('button', { name: 'Add Monitor' }));
  expect(screen.getByTestId('cart-count').textContent).toBe('Items: 1');
  await user.click(screen.getByRole('button', { name: 'Clear cart' }));
  expect(screen.getByTestId('cart-count').textContent).toBe('Items: 0');
  expect(screen.getByTestId('cart-total').textContent).toBe('Total: $0');
});

test('components read the store through selectors', () => {
  expect(sources['App.jsx']).toMatch(/useCartStore\(\s*select(Count|Total)\s*\)/);
  expect(sources['App.jsx']).toMatch(/useCartStore\(\s*\(?\s*\w+\s*\)?\s*=>/);
});
