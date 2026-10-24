const { createPinia, setActivePinia } = require('pinia');
const { useCartStore } = modules['store.ts'];

function freshCart() {
  setActivePinia(createPinia());
  return useCartStore();
}

test('addItem adds new items and increments the quantity of existing ones', () => {
  const cart = freshCart();
  cart.addItem('Keyboard', 120);
  cart.addItem('Keyboard', 120);
  cart.addItem('Mouse', 45);
  expect(cart.items).toEqual([
    { name: 'Keyboard', price: 120, quantity: 2 },
    { name: 'Mouse', price: 45, quantity: 1 },
  ]);
});

test('count and total getters derive from state', () => {
  const cart = freshCart();
  cart.addItem('Keyboard', 120);
  cart.addItem('Mouse', 45);
  cart.addItem('Mouse', 45);
  expect(cart.count).toBe(3);
  expect(cart.total).toBe(210);
});

test('removeItem removes an item by name', () => {
  const cart = freshCart();
  cart.addItem('Keyboard', 120);
  cart.addItem('Mouse', 45);
  cart.removeItem('Keyboard');
  expect(cart.items.map((item: { name: string }) => item.name)).toEqual(['Mouse']);
  expect(cart.total).toBe(45);
});

test('the component shows "Items" and "Total" and updates on click', async () => {
  render(mod.default, { global: { plugins: [createPinia()] } });
  expect(screen.getByText('Items: 0')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Add Keyboard' }));
  await user.click(screen.getByRole('button', { name: 'Add Mouse' }));
  expect(screen.getByText('Items: 2')).toBeInTheDocument();
  expect(screen.getByText('Total: $165')).toBeInTheDocument();
});

test('"Clear cart" resets the store with $reset()', async () => {
  render(mod.default, { global: { plugins: [createPinia()] } });
  await user.click(screen.getByRole('button', { name: 'Add Keyboard' }));
  await user.click(screen.getByRole('button', { name: 'Clear cart' }));
  expect(screen.getByText('Items: 0')).toBeInTheDocument();
  expect(useCartStore().items).toEqual([]);
  expect(sources['App.vue']).toMatch(/\$reset\(\)/);
});
