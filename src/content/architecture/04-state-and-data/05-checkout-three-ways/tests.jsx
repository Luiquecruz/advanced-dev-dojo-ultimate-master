const { QueryClient, QueryClientProvider } = require('@tanstack/react-query');

const implementationFiles = ['local/useCheckout.js', 'query/useCheckout.jsx', 'machine/useCheckout.js'];
const cartItems = [{ id: 2, name: 'Mouse', price: 45, quantity: 1 }];
const card = '4242424242424242';

function renderCheckout(file) {
  const implementation = modules[file];
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const Provider = implementation.CheckoutProvider ?? React.Fragment;
  function wrapper({ children }) {
    return (
      <QueryClientProvider client={queryClient}>
        <Provider>{children}</Provider>
      </QueryClientProvider>
    );
  }
  return renderHook(() => implementation.useCheckout(), { wrapper }).result;
}

function interceptOrders() {
  const requests = [];
  const pendingResponses = [];
  mockApi('/api/orders', ({ method, body }) => {
    requests.push({ method, body });
    return new Promise((resolve) => pendingResponses.push(resolve));
  });
  return {
    requests,
    respond: async (status, data) => {
      await waitFor(() => expect(pendingResponses.length).toBeGreaterThan(0));
      await act(async () => pendingResponses.shift()(jsonResponse(data, status)));
    },
  };
}

function expectFor(file, actual, expected) {
  expect([file, actual]).toEqual([file, expected]);
}

async function waitForStep(file, result, step) {
  await waitFor(() => expectFor(file, result.current.step, step));
}

function goToPayment(result) {
  act(() => result.current.next({ items: cartItems }));
  act(() => result.current.next({ address: '1 Main St' }));
}

test('happy path in every version: cart → shipping → payment → submitting → done, POSTing the collected data once', async () => {
  for (const file of implementationFiles) {
    const orders = interceptOrders();
    const result = renderCheckout(file);
    expectFor(file, { step: result.current.step, data: result.current.data, error: result.current.error, order: result.current.order }, {
      step: 'cart',
      data: { items: [], address: '', card: '' },
      error: null,
      order: null,
    });
    act(() => result.current.next({ items: cartItems }));
    expectFor(file, result.current.step, 'shipping');
    act(() => result.current.next({ address: '1 Main St' }));
    expectFor(file, result.current.step, 'payment');
    act(() => result.current.submit({ card }));
    await waitForStep(file, result, 'submitting');
    await orders.respond(201, { id: 7 });
    await waitForStep(file, result, 'done');
    expectFor(file, result.current.order, { id: 7 });
    expectFor(file, orders.requests, [{ method: 'POST', body: { items: cartItems, address: '1 Main St', card } }]);
  }
});

test('back() returns to the previous step and keeps the data entered there', async () => {
  for (const file of implementationFiles) {
    const result = renderCheckout(file);
    act(() => result.current.back());
    expectFor(file, result.current.step, 'cart');
    goToPayment(result);
    act(() => result.current.back());
    expectFor(file, result.current.step, 'shipping');
    expectFor(file, result.current.data.address, '1 Main St');
    act(() => result.current.back());
    expectFor(file, result.current.step, 'cart');
    act(() => result.current.next());
    expectFor(file, result.current.data, { items: cartItems, address: '1 Main St', card: '' });
    act(() => result.current.next({ address: '2 Side St' }));
    expectFor(file, result.current.step, 'payment');
    expectFor(file, result.current.data.address, '2 Side St');
  }
});

test('impossible transitions are ignored: submit() from cart, next() on payment, anything while submitting or done', async () => {
  for (const file of implementationFiles) {
    const orders = interceptOrders();
    const result = renderCheckout(file);
    act(() => result.current.submit({ card }));
    act(() => result.current.retry());
    expectFor(file, result.current.step, 'cart');
    goToPayment(result);
    act(() => result.current.next({ address: 'Somewhere else' }));
    act(() => result.current.retry());
    expectFor(file, result.current.step, 'payment');
    expectFor(file, result.current.data.address, '1 Main St');
    act(() => result.current.submit({ card }));
    await waitForStep(file, result, 'submitting');
    act(() => result.current.back());
    act(() => result.current.next({ address: 'Somewhere else' }));
    act(() => result.current.submit({ card }));
    expectFor(file, result.current.step, 'submitting');
    await orders.respond(201, { id: 1 });
    await waitForStep(file, result, 'done');
    act(() => result.current.back());
    act(() => result.current.retry());
    expectFor(file, result.current.step, 'done');
    expectFor(file, orders.requests.length, 1);
    expectFor(file, result.current.data.address, '1 Main St');
  }
});

test('a double submit (two calls in the same tick) sends exactly one request', async () => {
  for (const file of implementationFiles) {
    const orders = interceptOrders();
    const result = renderCheckout(file);
    goToPayment(result);
    act(() => {
      result.current.submit({ card });
      result.current.submit({ card });
    });
    await waitFor(() => expectFor(file, orders.requests.length, 1));
    await orders.respond(201, { id: 3 });
    await waitForStep(file, result, 'done');
    expectFor(file, orders.requests.length, 1);
  }
});

test('a failed order shows the error, back() returns to payment, and retry() sends the same data again until it succeeds', async () => {
  for (const file of implementationFiles) {
    const orders = interceptOrders();
    const result = renderCheckout(file);
    goToPayment(result);
    act(() => result.current.submit({ card }));
    await waitFor(() => expectFor(file, orders.requests.length, 1));
    await orders.respond(503, { error: 'Service unavailable' });
    await waitForStep(file, result, 'error');
    expectFor(file, result.current.error, 'Order failed: 503');
    act(() => result.current.back());
    await waitForStep(file, result, 'payment');
    expectFor(file, result.current.error, null);
    act(() => result.current.submit({ card }));
    await waitFor(() => expectFor(file, orders.requests.length, 2));
    await orders.respond(503, { error: 'Service unavailable' });
    await waitForStep(file, result, 'error');
    act(() => result.current.retry());
    await waitForStep(file, result, 'submitting');
    expectFor(file, result.current.error, null);
    await orders.respond(201, { id: 9 });
    await waitForStep(file, result, 'done');
    expectFor(file, result.current.order, { id: 9 });
    expectFor(file, orders.requests.length, 3);
    expectFor(file, orders.requests[2], orders.requests[0]);
  }
});

test('each version is built with its own tool, only api/placeOrder.js calls fetch, and the shared view drives the machine', async () => {
  expect(sources['local/useCheckout.js']).toMatch(/useReducer\s*\(/);
  expect(sources['query/useCheckout.jsx']).toMatch(/useMutation\s*\(/);
  expect(sources['query/useCheckout.jsx']).toMatch(/createContext\s*\(/);
  expect(sources['machine/useCheckout.js']).toMatch(/setup\s*\(/);
  expect(sources['machine/useCheckout.js']).toMatch(/createMachine\s*\(/);
  expect(sources['machine/useCheckout.js']).toMatch(/fromPromise\s*\(/);
  expect(sources['machine/useCheckout.js']).toMatch(/useMachine\s*\(/);
  Object.entries(sources)
    .filter(([fileName]) => fileName !== 'api/placeOrder.js')
    .forEach(([fileName, code]) => expectFor(fileName, /\bfetch\s*\(/.test(code), false));
  mockApi('/api/orders', () => jsonResponse({ id: 12 }, 201));
  render(<mod.default />);
  await user.selectOptions(screen.getByLabelText('Implementation'), 'machine');
  await user.click(screen.getByRole('button', { name: 'Continue to shipping' }));
  await user.type(screen.getByLabelText('Address'), '1 Main St');
  await user.click(screen.getByRole('button', { name: 'Continue to payment' }));
  await user.type(screen.getByLabelText('Card number'), card);
  await user.click(screen.getByRole('button', { name: 'Pay' }));
  expect(await screen.findByText('Order #12 placed')).toBeInTheDocument();
});
