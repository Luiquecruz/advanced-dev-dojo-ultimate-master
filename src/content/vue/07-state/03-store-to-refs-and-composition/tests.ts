const { createPinia, setActivePinia } = require('pinia');
const { useCartStore } = modules['cart.ts'];
const { useProductsStore } = modules['products.ts'];
const CartSummary = modules['CartSummary.vue'].default;

function freshPinia() {
  const pinia = createPinia();
  setActivePinia(pinia);
  return pinia;
}

test('cart.items resolves ids to products from the products store', () => {
  freshPinia();
  const cart = useCartStore();
  cart.add(2);
  cart.add(1);
  expect(cart.items.map((product: { name: string }) => product.name)).toEqual(['Mouse', 'Keyboard']);
  expect(cart.total).toBe(165);
});

test('changing a price in the products store updates the cart total', () => {
  freshPinia();
  const cart = useCartStore();
  cart.add(1);
  useProductsStore().setPrice(1, 100);
  expect(cart.total).toBe(100);
});

test('CartSummary updates "Total: $N" after clicking the add buttons', async () => {
  render(CartSummary, { global: { plugins: [freshPinia()] } });
  await user.click(screen.getByRole('button', { name: 'Add Keyboard' }));
  await user.click(screen.getByRole('button', { name: 'Add Mouse' }));
  expect(screen.getByText('Total: $165')).toBeInTheDocument();
  expect(screen.getAllByRole('listitem')).toHaveLength(2);
});

test('CartSummary reacts to changes made outside the component', async () => {
  const pinia = freshPinia();
  render(CartSummary, { global: { plugins: [pinia] } });
  useCartStore().add(3);
  await nextTick();
  expect(screen.getByText('Total: $340')).toBeInTheDocument();
});

test('CartSummary destructures state and getters with storeToRefs', () => {
  expect(sources['CartSummary.vue']).toMatch(/storeToRefs\(\s*cart\s*\)/);
});
