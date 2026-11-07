const cartService = () => TestBed.inject(modules['cart.ts'].CartService);
const keyboard = { id: 1, name: 'Keyboard', price: 120 };
const mouse = { id: 2, name: 'Mouse', price: 45 };

test('add() appends new products and increases the quantity of existing ones with a new array', () => {
  const cart = cartService();
  cart.add(keyboard);
  const before = cart.items();
  cart.add(keyboard);
  cart.add(mouse);
  expect(cart.items()).not.toBe(before);
  expect(cart.items()).toEqual([
    { ...keyboard, quantity: 2 },
    { ...mouse, quantity: 1 },
  ]);
});

test('count and total are derived from the items', () => {
  const cart = cartService();
  cart.add(keyboard);
  cart.add(keyboard);
  cart.add(mouse);
  expect(cart.count()).toBe(3);
  expect(cart.total()).toBe(285);
  cart.remove(1);
  expect(cart.count()).toBe(1);
  expect(cart.total()).toBe(45);
});

test('items is a read-only signal created with asReadonly()', () => {
  const cart = cartService();
  expect(typeof cart.items).toBe('function');
  expect(cart.items.set).toBeUndefined();
  expect(cart.items.update).toBeUndefined();
  expect(sources['cart.ts']).toMatch(/asReadonly\(\s*\)/);
});

test('CartSummary renders the cart and updates when buttons are clicked', async () => {
  await render(mod.CartSummary);
  expect(screen.getByText('Items: 0')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Add Keyboard' }));
  await user.click(screen.getByRole('button', { name: 'Add Keyboard' }));
  await user.click(screen.getByRole('button', { name: 'Add Mouse' }));
  await stable();
  expect(screen.getByText('Items: 3')).toBeInTheDocument();
  expect(screen.getByText('Total: 285')).toBeInTheDocument();
  expect(screen.getAllByRole('listitem').map((item) => item.textContent.trim())).toEqual(['Keyboard x 2', 'Mouse x 1']);
});

test('the component and other consumers share the same root instance', async () => {
  await render(mod.CartSummary);
  cartService().add(mouse);
  await stable();
  expect(screen.getByText('Items: 1')).toBeInTheDocument();
  expect(screen.getByText('Total: 45')).toBeInTheDocument();
});
