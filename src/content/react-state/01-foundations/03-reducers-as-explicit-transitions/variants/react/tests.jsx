const deepFreeze = (value) => {
  Object.values(value).forEach((child) => child && typeof child === 'object' && deepFreeze(child));
  return Object.freeze(value);
};

const run = (actions, start = mod.initialCheckout) => actions.reduce((state, action) => mod.checkoutReducer(state, action), start);

test('the happy path moves shipping → payment → review → submitting → done and stores each payload', () => {
  const review = run([
    { type: 'shippingSubmitted', address: '1 Infinite Loop' },
    { type: 'paymentSubmitted', card: '4242424242424242' },
  ]);
  expect(review).toEqual({ status: 'review', address: '1 Infinite Loop', card: '4242424242424242', orderId: null, error: null });
  const done = run([{ type: 'orderPlaced' }, { type: 'orderSucceeded', orderId: 'A-1' }], review);
  expect(done.status).toBe('done');
  expect(done.orderId).toBe('A-1');
  expect(run([{ type: 'restarted' }], done)).toEqual(mod.initialCheckout);
});

test('"back", failures and retries follow the transition table', () => {
  const payment = run([{ type: 'shippingSubmitted', address: 'Main St' }]);
  expect(run([{ type: 'back' }], payment).status).toBe('shipping');
  const failed = run([{ type: 'paymentSubmitted', card: '1111' }, { type: 'orderPlaced' }, { type: 'orderFailed', error: 'Card declined' }], payment);
  expect(failed.status).toBe('failed');
  expect(failed.error).toBe('Card declined');
  const retried = run([{ type: 'retried' }], failed);
  expect(retried.status).toBe('review');
  expect(retried.error).toBeNull();
});

test('known events that are not allowed in the current status return the same state object', () => {
  const shipping = deepFreeze({ ...mod.initialCheckout });
  expect(mod.checkoutReducer(shipping, { type: 'orderPlaced' })).toBe(shipping);
  expect(mod.checkoutReducer(shipping, { type: 'back' })).toBe(shipping);
  const submitting = deepFreeze({ ...mod.initialCheckout, status: 'submitting', address: 'Main St', card: '1111' });
  expect(mod.checkoutReducer(submitting, { type: 'orderPlaced' })).toBe(submitting);
  expect(mod.checkoutReducer(submitting, { type: 'back' })).toBe(submitting);
  expect(mod.checkoutReducer(deepFreeze({ ...mod.initialCheckout, status: 'done' }), { type: 'orderFailed', error: 'x' }).status).toBe('done');
});

test('unknown action types throw an Error', () => {
  expect(() => mod.checkoutReducer(mod.initialCheckout, { type: 'teleported' })).toThrow();
});

test('placing an order shows "Placing order..." and then the confirmation; placeOrder is called once with the data', async () => {
  let resolveOrder;
  const placeOrder = fn(() => new Promise((resolve) => (resolveOrder = resolve)));
  render(<mod.Checkout placeOrder={placeOrder} />);
  await user.type(screen.getByLabelText('Address'), '1 Infinite Loop');
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  await user.type(screen.getByLabelText('Card number'), '4242424242424242');
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  expect(screen.getByText('Card ending in 4242')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Place order' }));
  expect(screen.getByRole('status')).toHaveTextContent('Placing order...');
  expect(placeOrder).toHaveBeenCalledTimes(1);
  expect(placeOrder).toHaveBeenCalledWith({ address: '1 Infinite Loop', card: '4242424242424242' });
  await act(async () => resolveOrder({ orderId: 'A-100' }));
  expect(await screen.findByRole('heading', { name: 'Order A-100 confirmed' })).toBeInTheDocument();
});

test('a failed order shows the error and "Try again" returns to the review step', async () => {
  const placeOrder = fn().mockRejectedValue(new Error('Card declined'));
  render(<mod.Checkout placeOrder={placeOrder} />);
  await user.type(screen.getByLabelText('Address'), 'Main St');
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  await user.type(screen.getByLabelText('Card number'), '1111');
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  await user.click(screen.getByRole('button', { name: 'Place order' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Card declined');
  await user.click(screen.getByRole('button', { name: 'Try again' }));
  expect(screen.getByRole('button', { name: 'Place order' })).toBeInTheDocument();
});
