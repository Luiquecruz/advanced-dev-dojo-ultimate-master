test('CartService is a root singleton with add() and count', () => {
  const { CartService } = modules['cart.service.ts'];
  const cart = TestBed.inject(CartService);
  expect(TestBed.inject(CartService)).toBe(cart);
  cart.add('Keyboard');
  cart.add('Mouse');
  expect(cart.items()).toEqual(['Keyboard', 'Mouse']);
  expect(cart.count()).toBe(2);
});

test('add() creates a new array and clear() empties the cart', () => {
  const cart = TestBed.inject(modules['cart.service.ts'].CartService);
  const before = cart.items();
  cart.add('Keyboard');
  expect(cart.items()).not.toBe(before);
  expect(before).toEqual([]);
  cart.clear();
  expect(cart.items()).toEqual([]);
});

test('clicking "Add Keyboard" updates the badge in another component', async () => {
  await render(mod.App);
  expect(screen.getByText('Items: 0')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Add Keyboard' }));
  await user.click(screen.getByRole('button', { name: 'Add Mouse' }));
  await stable();
  expect(screen.getByText('Items: 2')).toBeInTheDocument();
});

test('the badge "Clear" button empties the shared cart', async () => {
  await render(mod.App);
  await user.click(screen.getByRole('button', { name: 'Add Mouse' }));
  await stable();
  await user.click(screen.getByRole('button', { name: 'Clear' }));
  await stable();
  expect(screen.getByText('Items: 0')).toBeInTheDocument();
  expect(TestBed.inject(modules['cart.service.ts'].CartService).count()).toBe(0);
});

test('components use inject() and do not re-provide the service', () => {
  expect(source).toMatch(/inject\(\s*CartService\s*\)/);
  expect(source).not.toMatch(/providers\s*:/);
});
