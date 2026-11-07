const products = [
  { id: 1, name: 'Keyboard', price: 120, category: 'hardware' },
  { id: 2, name: 'Mouse', price: 45, category: 'hardware' },
  { id: 3, name: 'IDE License', price: 199, category: 'software' },
];
const memory = (initial) => {
  const data = new Map(initial === undefined ? [] : [['cart', initial]]);
  return { data, getItem: (key) => data.get(key) ?? null, setItem: (key, value) => void data.set(key, value) };
};
const setup = ({ fetchProducts = fn().mockResolvedValue(products), stored } = {}) => {
  const storage = memory(stored);
  TestBed.configureTestingModule({
    providers: [
      { provide: mod.FETCH_PRODUCTS, useValue: fetchProducts },
      { provide: mod.CART_STORAGE, useValue: storage },
    ],
  });
  return { store: TestBed.inject(mod.ShopStore), storage, fetchProducts };
};

test('load() moves through loading to ready, ignores overlapping calls and keeps the products on error', async () => {
  let release;
  const fetchProducts = fn(() => new Promise((resolve) => (release = resolve)));
  const { store } = setup({ fetchProducts });
  expect(store.status()).toBe('idle');
  const first = store.load();
  expect(store.status()).toBe('loading');
  await store.load();
  expect(fetchProducts).toHaveBeenCalledTimes(1);
  release(products);
  await first;
  expect(store.status()).toBe('ready');
  expect(store.products()).toEqual(products);
  fetchProducts.mockRejectedValueOnce(new Error('offline'));
  await store.load();
  expect(store.status()).toBe('error');
  expect(store.products()).toEqual(products);
});

test('visible, lines, itemCount and total are derived from the products, the category and the quantities', async () => {
  const { store } = setup({ stored: JSON.stringify({ version: 1, quantities: { 1: 1, 2: 2, 99: 4 } }) });
  await store.load();
  expect(store.visible()).toHaveLength(3);
  store.setCategory('software');
  expect(store.visible().map((product) => product.name)).toEqual(['IDE License']);
  expect(store.lines()).toEqual([
    { product: products[0], quantity: 1, subtotal: 120 },
    { product: products[1], quantity: 2, subtotal: 90 },
  ]);
  expect(store.itemCount()).toBe(3);
  expect(store.total()).toBe(210);
});

test('add() and remove() change the quantities, ignore invalid ids and delete entries at zero', async () => {
  const { store } = setup();
  await store.load();
  store.add(2);
  store.add(1);
  store.add(2);
  expect(store.quantities()).toEqual({ 1: 1, 2: 2 });
  store.remove(2);
  expect(store.total()).toBe(165);
  store.remove(2);
  store.remove(2);
  store.remove(99);
  expect(store.quantities()).toEqual({ 1: 1 });
  store.add(0);
  store.add(-1);
  store.add(1.5);
  expect(store.quantities()).toEqual({ 1: 1 });
});

test('every cart change is written as a versioned envelope with only the quantities', async () => {
  const { store, storage } = setup();
  await store.load();
  store.add(1);
  store.add(1);
  expect(JSON.parse(storage.data.get('cart'))).toEqual({ version: 1, quantities: { 1: 2 } });
  store.remove(1);
  store.remove(1);
  expect(JSON.parse(storage.data.get('cart'))).toEqual({ version: 1, quantities: {} });
});

test('the cart is restored when the store is created and invalid data is dropped', () => {
  const restored = (stored) => {
    TestBed.resetTestingModule();
    return setup({ stored }).store.quantities();
  };
  expect(restored(JSON.stringify({ version: 1, quantities: { 1: 3 } }))).toEqual({ 1: 3 });
  expect(restored(JSON.stringify({ version: 1, quantities: { 1: 2, 2: 'x', 3: -1, a: 4, 0: 5, '-1': 2 } }))).toEqual({ 1: 2 });
  for (const stored of ['{bad', 'null', JSON.stringify({ version: 2, quantities: { 1: 1 } })]) {
    expect(restored(stored)).toEqual({});
  }
});
