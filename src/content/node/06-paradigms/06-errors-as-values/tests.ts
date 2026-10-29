const frozenAccounts = () => {
  const accounts = mod.createAccounts();
  accounts.forEach((account: any) => Object.freeze(account));
  return accounts;
};

test('map transforms ok values and andThen chains, both passing errors through untouched', () => {
  expect(mod.map(mod.ok(2), (x: number) => x * 10)).toEqual({ ok: true, value: 20 });
  const failure = mod.err({ type: 'same_account' });
  const next = fn((x: number) => mod.ok(x));
  expect(mod.map(failure, next)).toBe(failure);
  expect(mod.andThen(failure, next)).toBe(failure);
  expect(next).not.toHaveBeenCalled();
  expect(mod.andThen(mod.ok(3), (x: number) => mod.ok(x + 1))).toEqual({ ok: true, value: 4 });
  expect(mod.andThen(mod.ok(3), () => mod.err('stop'))).toEqual({ ok: false, error: 'stop' });
});

test('transfer returns new accounts with moved balances and leaves the map untouched', () => {
  const accounts = frozenAccounts();
  const result = mod.transfer(accounts, { from: 'alice', to: 'bob', amount: 1500 });
  expect(result).toEqual({ ok: true, value: { from: { id: 'alice', balance: 8500 }, to: { id: 'bob', balance: 4000 } } });
  expect(accounts.get('alice').balance).toBe(10000);
  expect(mod.transfer(accounts, { from: 'bob', to: 'alice', amount: 2500 }).ok).toBe(true);
});

test('transfer returns the first failing rule as a value and never throws', () => {
  const accounts = frozenAccounts();
  for (const amount of [0, -5, 10.5, '100', undefined]) {
    expect(mod.transfer(accounts, { from: 'alice', to: 'bob', amount })).toEqual({ ok: false, error: { type: 'invalid_amount' } });
  }
  expect(mod.transfer(accounts, { from: 'alice', to: 'alice', amount: 1 }).error).toEqual({ type: 'same_account' });
  expect(mod.transfer(accounts, { from: 'carol', to: 'dave', amount: 1 }).error).toEqual({ type: 'account_not_found', accountId: 'carol' });
  expect(mod.transfer(accounts, { from: 'alice', to: 'dave', amount: 1 }).error).toEqual({ type: 'account_not_found', accountId: 'dave' });
  expect(mod.transfer(accounts, { from: 'bob', to: 'alice', amount: 2501 }).error).toEqual({ type: 'insufficient_funds', balance: 2500, amount: 2501 });
});

test('toHttpError maps every domain error to a status and a message', () => {
  expect(mod.toHttpError({ type: 'invalid_amount' })).toEqual({ status: 400, body: { error: 'invalid_amount', message: 'Amount must be a positive integer of cents' } });
  expect(mod.toHttpError({ type: 'same_account' })).toEqual({ status: 400, body: { error: 'same_account', message: 'Cannot transfer to the same account' } });
  expect(mod.toHttpError({ type: 'account_not_found', accountId: 'carol' })).toEqual({ status: 404, body: { error: 'account_not_found', message: 'Account carol not found' } });
  expect(mod.toHttpError({ type: 'insufficient_funds', balance: 2500, amount: 3000 })).toEqual({ status: 422, body: { error: 'insufficient_funds', message: 'Balance 2500 is lower than 3000' } });
});

test('POST /transfers commits successful transfers and answers errors with their HTTP mapping', async () => {
  const first = await request(mod.app, '/transfers', { method: 'POST', body: { from: 'alice', to: 'bob', amount: 9000 } });
  expect(first.status).toBe(200);
  expect(first.body).toEqual({ from: { id: 'alice', balance: 1000 }, to: { id: 'bob', balance: 11500 } });
  expect(mod.accounts.get('bob').balance).toBe(11500);
  const second = await request(mod.app, '/transfers', { method: 'POST', body: { from: 'alice', to: 'bob', amount: 9000 } });
  expect(second.status).toBe(422);
  expect(second.body).toEqual({ error: 'insufficient_funds', message: 'Balance 1000 is lower than 9000' });
  const missing = await request(mod.app, '/transfers', { method: 'POST', body: { from: 'alice', to: 'zoe', amount: 1 } });
  expect(missing.status).toBe(404);
  expect(mod.accounts.get('alice').balance).toBe(1000);
});
