const fakeClient = (response: any, error: any = null) => ({ makePayment: fn((request: any, callback: any) => setTimeout(() => callback(error, response), 0)) });
const fakeGateway = (impl?: any) => ({ charge: fn(impl ?? (async () => ({ id: 'ch_1', status: 'succeeded' }))) });

test('LegacyPayAdapter converts cents and currency and maps the callback response', async () => {
  const client = fakeClient({ transactionRef: 'LP-9', approved: true });
  const adapter = new mod.LegacyPayAdapter(client);
  expect(await adapter.charge(1250, 'usd')).toEqual({ id: 'LP-9', status: 'succeeded' });
  expect(client.makePayment.mock.calls[0][0]).toEqual({ value: '12.50', curr: 'USD' });
  const declined = new mod.LegacyPayAdapter(fakeClient({ transactionRef: 'LP-10', approved: false }));
  expect(await declined.charge(5, 'eur')).toEqual({ id: 'LP-10', status: 'declined' });
});

test('LegacyPayAdapter rejects with the client error', async () => {
  const adapter = new mod.LegacyPayAdapter(fakeClient(undefined, new Error('Unsupported currency BRL')));
  await expect(adapter.charge(100, 'brl')).rejects.toThrow('Unsupported currency BRL');
});

test('withLogging logs every outcome and returns or rethrows it unchanged', async () => {
  const log = fn();
  const result = { id: 'ch_1', status: 'succeeded' };
  const logged = mod.withLogging(fakeGateway(async () => result), log);
  expect(await logged.charge(1250, 'USD')).toBe(result);
  expect(log).toHaveBeenLastCalledWith('charge 1250 USD -> succeeded (ch_1)');
  const failure = new Error('network down');
  const failing = mod.withLogging(fakeGateway(async () => { throw failure; }), log);
  await expect(failing.charge(99, 'EUR')).rejects.toBe(failure);
  expect(log).toHaveBeenLastCalledWith('charge 99 EUR -> error: network down');
});

test('withLimit rejects amounts above the limit without calling the wrapped gateway', async () => {
  const inner = fakeGateway();
  const limited = mod.withLimit(inner, 1000);
  expect(await limited.charge(1000, 'USD')).toEqual({ id: 'ch_1', status: 'succeeded' });
  await expect(limited.charge(1001, 'USD')).rejects.toThrow('Amount exceeds limit of 1000');
  expect(inner.charge).toHaveBeenCalledTimes(1);
});

test('createPaymentGateway builds the provider from config and fails fast on unknown providers', async () => {
  expect(await mod.createPaymentGateway({ provider: 'fake' }).charge(100, 'USD')).toEqual({ id: 'fake_1', status: 'succeeded' });
  const client = fakeClient({ transactionRef: 'LP-1', approved: true });
  expect(await mod.createPaymentGateway({ provider: 'legacy' }, { legacyClient: client }).charge(100, 'usd')).toEqual({ id: 'LP-1', status: 'succeeded' });
  expect(await mod.createPaymentGateway({ provider: 'legacy' }).charge(2000, 'usd')).toEqual({ id: 'LP-1', status: 'succeeded' });
  expect(() => mod.createPaymentGateway({ provider: 'stripe-typo' })).toThrow('Unknown payment provider: stripe-typo');
});

test('logging is the outermost decorator, so limit rejections are logged too', async () => {
  const log = fn();
  const gateway = mod.createPaymentGateway({ provider: 'fake', logging: true, maxAmountCents: 100000 }, { log });
  await gateway.charge(500, 'USD');
  await expect(gateway.charge(500000, 'USD')).rejects.toThrow('Amount exceeds limit of 100000');
  expect(log.mock.calls.map((call: any) => call[0])).toEqual(['charge 500 USD -> succeeded (fake_1)', 'charge 500000 USD -> error: Amount exceeds limit of 100000']);
});
