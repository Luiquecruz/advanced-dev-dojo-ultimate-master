test('pay() emits "paid" with { orderId, amount }', () => {
  const checkout = new mod.Checkout();
  const listener = fn();
  checkout.on('paid', listener);
  checkout.pay('A-1', 30);
  expect(listener).toHaveBeenCalledTimes(1);
  expect(listener).toHaveBeenCalledWith({ orderId: 'A-1', amount: 30 });
});

test('pay() with an amount <= 0 emits "error" with "Invalid amount for <orderId>"', () => {
  const checkout = new mod.Checkout();
  const listener = fn();
  const paid = fn();
  checkout.on('error', listener);
  checkout.on('paid', paid);
  checkout.pay('A-2', 0);
  expect(listener).toHaveBeenCalledTimes(1);
  expect(listener.mock.calls[0][0]).toBeInstanceOf(Error);
  expect(listener.mock.calls[0][0].message).toBe('Invalid amount for A-2');
  expect(paid).not.toHaveBeenCalled();
});

test('onPaid() returns an unsubscribe function that removes the listener', () => {
  const checkout = new mod.Checkout();
  const listener = fn();
  const stop = mod.onPaid(checkout, listener);
  checkout.pay('A-1', 10);
  stop();
  checkout.pay('A-2', 20);
  expect(listener).toHaveBeenCalledTimes(1);
  expect(checkout.listenerCount('paid')).toBe(0);
});

test('nextPayment() resolves with the next payment and rejects when "error" comes first', async () => {
  const checkout = new mod.Checkout();
  const pending = mod.nextPayment(checkout);
  checkout.pay('A-7', 99);
  await expect(pending).resolves.toEqual({ orderId: 'A-7', amount: 99 });
  const failing = mod.nextPayment(checkout);
  checkout.pay('A-8', -5);
  await expect(failing).rejects.toThrow('Invalid amount for A-8');
  expect(source).toMatch(/\bonce\s*\(/);
});

test('attachErrorLogger() logs "Payment failed: <message>" and stops the error from throwing', () => {
  const checkout = new mod.Checkout();
  const logs = captureLogs();
  mod.attachErrorLogger(checkout);
  expect(() => checkout.pay('A-9', 0)).not.toThrow();
  expect(logs).toContain('Payment failed: Invalid amount for A-9');
});
