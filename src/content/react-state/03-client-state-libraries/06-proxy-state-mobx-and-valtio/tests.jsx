const { isComputedProp } = require('mobx');

function renderShop() {
  const { createCartStore } = modules['cartStore.js'];
  const { createWishlist } = modules['wishlist.js'];
  const cart = createCartStore();
  const wishlist = createWishlist();
  const Shop = mod.Shop;
  render(<Shop cart={cart} wishlist={wishlist} />);
  return { cart, wishlist };
}

test('count and total are MobX computed values that stay correct after remove()', () => {
  const { createCartStore } = modules['cartStore.js'];
  const cart = createCartStore();
  expect(isComputedProp(cart, 'count')).toBe(true);
  expect(isComputedProp(cart, 'total')).toBe(true);
  cart.add({ id: 1, name: 'Keyboard', price: 120 });
  cart.add({ id: 1, name: 'Keyboard', price: 120 });
  cart.add({ id: 2, name: 'Mouse', price: 45 });
  expect(cart.count).toBe(3);
  expect(cart.total).toBe(285);
  cart.remove(1);
  expect(cart.count).toBe(1);
  expect(cart.total).toBe(45);
});

test('clicking "Add ..." updates the CartSummary (it observes the store)', async () => {
  renderShop();
  await user.click(screen.getByRole('button', { name: 'Add Keyboard' }));
  await user.click(screen.getByRole('button', { name: 'Add Keyboard' }));
  await user.click(screen.getByRole('button', { name: 'Add Mouse' }));
  expect(screen.getByTestId('cart-count')).toHaveTextContent('Items: 3');
  expect(screen.getByTestId('cart-total')).toHaveTextContent('Total: $285');
});

test('"Remove ..." removes the line and updates the total', async () => {
  renderShop();
  await user.click(screen.getByRole('button', { name: 'Add Keyboard' }));
  await user.click(screen.getByRole('button', { name: 'Add Mouse' }));
  await user.click(await screen.findByRole('button', { name: 'Remove Keyboard' }));
  expect(screen.queryByRole('button', { name: 'Remove Keyboard' })).toBeNull();
  expect(screen.getByTestId('cart-total')).toHaveTextContent('Total: $45');
});

test('the store can be changed outside React and the summary follows', async () => {
  const { cart } = renderShop();
  act(() => {
    cart.add({ id: 3, name: 'Monitor', price: 340 });
  });
  expect(screen.getByTestId('cart-total')).toHaveTextContent('Total: $340');
});

test('"Save ..." toggles the product in the wishlist proxy', async () => {
  const { wishlist } = renderShop();
  const button = screen.getByRole('button', { name: 'Save Mouse' });
  expect(button).toHaveAttribute('aria-pressed', 'false');
  await user.click(button);
  expect(wishlist.ids).toEqual([2]);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Save Mouse' })).toHaveAttribute('aria-pressed', 'true'));
  await user.click(screen.getByRole('button', { name: 'Save Mouse' }));
  expect(wishlist.ids).toEqual([]);
});

test('WishlistCount re-renders from its snapshot', async () => {
  renderShop();
  await user.click(screen.getByRole('button', { name: 'Save Keyboard' }));
  await user.click(screen.getByRole('button', { name: 'Save Monitor' }));
  await waitFor(() => expect(screen.getByTestId('saved-count')).toHaveTextContent('Saved: 2'));
});
