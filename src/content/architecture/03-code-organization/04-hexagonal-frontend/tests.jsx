const keyboard = { productId: 1, name: 'Keyboard', price: 120, quantity: 1 };
const mouse = { productId: 2, name: 'Mouse', price: 45, quantity: 1 };
const cloudCredits = { productId: 5, name: 'Cloud Credits', price: 50, quantity: 2 };

function watchNetwork() {
  const networkHandler = fn(() => jsonResponse({ error: 'unexpected request' }, 500));
  mockApi(/.*/, networkHandler);
  return networkHandler;
}

test('domain: createOrder validates items and applies free shipping from 100, without React or fetch', () => {
  const networkHandler = watchNetwork();
  const { createOrder } = modules['domain/order.js'];
  expect(() => createOrder([])).toThrow('An order needs at least one item');
  expect(() => createOrder([{ ...mouse, quantity: 0 }])).toThrow('Quantities must be positive integers');
  expect(createOrder([mouse])).toEqual({ items: [mouse], subtotal: 45, shipping: 10, total: 55 });
  expect(createOrder([{ ...mouse, quantity: 2 }])).toEqual({ items: [{ ...mouse, quantity: 2 }], subtotal: 90, shipping: 10, total: 100 });
  expect(createOrder([cloudCredits])).toEqual({ items: [cloudCredits], subtotal: 100, shipping: 0, total: 100 });
  expect(networkHandler).not.toHaveBeenCalled();
});

test('application: placeOrder runs against the in-memory adapter, with no network', async () => {
  const networkHandler = watchNetwork();
  const { createInMemoryOrderGateway } = modules['adapters/inMemoryOrderGateway.js'];
  const { createPlaceOrder } = modules['application/placeOrder.js'];
  const orderGateway = createInMemoryOrderGateway();
  const placeOrder = createPlaceOrder(orderGateway);
  expect(await placeOrder([keyboard, mouse])).toEqual({ items: [keyboard, mouse], subtotal: 165, shipping: 0, total: 165, id: 1 });
  expect((await placeOrder([mouse])).id).toBe(2);
  await expect(placeOrder([])).rejects.toThrow('An order needs at least one item');
  expect(orderGateway.list().map((order) => [order.id, order.total])).toEqual([[1, 165], [2, 55]]);
  expect(networkHandler).not.toHaveBeenCalled();
});

test('adapter: the HTTP gateway POSTs the order as JSON, returns the new id and reports failures', async () => {
  const requests = [];
  mockApi('/api/orders', ({ method, body }) => {
    requests.push({ method, body });
    return jsonResponse({ id: 42 }, 201);
  });
  const { createHttpOrderGateway } = modules['adapters/httpOrderGateway.js'];
  const orderGateway = createHttpOrderGateway('/api/orders');
  const order = { items: [mouse], subtotal: 45, shipping: 10, total: 55 };
  expect(await orderGateway.save(order)).toEqual({ id: 42 });
  expect(requests).toEqual([{ method: 'POST', body: order }]);
  mockApi('/api/orders', () => jsonResponse({ error: 'Out of stock' }, 409));
  await expect(orderGateway.save(order)).rejects.toThrow('Order failed: 409');
});

test('UI: Checkout takes placeOrder from context, so a fake can be injected', async () => {
  const networkHandler = watchNetwork();
  const { PlaceOrderProvider } = modules['ui/PlaceOrderContext.jsx'];
  const { Checkout } = modules['ui/Checkout.jsx'];
  const outcomes = [Promise.resolve({ id: 7, total: 55 }), Promise.reject(new Error('Payment declined'))];
  outcomes[1].catch(() => {});
  const fakePlaceOrder = fn(() => outcomes.shift());
  render(
    <PlaceOrderProvider placeOrder={fakePlaceOrder}>
      <Checkout items={[mouse]} />
    </PlaceOrderProvider>,
  );
  await user.click(screen.getByRole('button', { name: 'Place order' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Order #7 placed: $55.00');
  expect(fakePlaceOrder).toHaveBeenCalledWith([mouse]);
  await user.click(screen.getByRole('button', { name: 'Place order' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Payment declined');
  expect(networkHandler).not.toHaveBeenCalled();
});

test('boundaries: domain and application import neither React nor adapters and never call fetch', () => {
  for (const fileName of ['domain/order.js', 'application/placeOrder.js']) {
    expect(sources[fileName]).not.toMatch(/from\s+['"]react/);
    expect(sources[fileName]).not.toMatch(/adapters\//);
    expect(sources[fileName]).not.toMatch(/\bfetch\s*\(/);
  }
  expect(sources['domain/order.js']).not.toMatch(/application\//);
  expect(sources['application/placeOrder.js']).toMatch(/from\s+['"]\.\.\/domain\/order/);
});

test('composition root: App wires the HTTP adapter, so the domain order reaches the API', async () => {
  const requests = [];
  mockApi('/api/todos', ({ method, body }) => {
    requests.push({ method, body });
    return jsonResponse({ id: 4 }, 201);
  });
  const App = mod.default;
  render(<App />);
  await user.click(screen.getByRole('button', { name: 'Place order' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Order #4 placed: $165.00');
  expect(requests).toEqual([{ method: 'POST', body: { items: [keyboard, mouse], subtotal: 165, shipping: 0, total: 165 } }]);
});
