test('unknown routes answer 404 { error: "Route not found" }', async () => {
  const response = await request(mod.app, '/nope');
  expect(response.status).toBe(404);
  expect(response.body).toEqual({ error: 'Route not found' });
});

test('NotFoundError becomes 404 with its message', async () => {
  const response = await request(mod.app, '/accounts/99');
  expect(response.status).toBe(404);
  expect(response.body).toEqual({ error: 'Account 99 not found' });
  const withdrawal = await request(mod.app, '/accounts/99/withdraw', { method: 'POST', body: { amount: 5 } });
  expect(withdrawal.status).toBe(404);
  expect(withdrawal.body).toEqual({ error: 'Account 99 not found' });
});

test('InsufficientFundsError becomes 422 and successful withdrawals answer 200', async () => {
  const rejected = await request(mod.app, '/accounts/2/withdraw', { method: 'POST', body: { amount: 50 } });
  expect(rejected.status).toBe(422);
  expect(rejected.body).toEqual({ error: 'Insufficient funds' });
  const accepted = await request(mod.app, '/accounts/2/withdraw', { method: 'POST', body: { amount: 15 } });
  expect(accepted.status).toBe(200);
  expect(accepted.body).toEqual({ id: 2, owner: 'Alan', balance: 5 });
});

test('invalid amounts throw an HTTPException that becomes 400 JSON', async () => {
  for (const amount of [0, -10, '20']) {
    const response = await request(mod.app, '/accounts/1/withdraw', { method: 'POST', body: { amount } });
    expect(response.status).toBe(400);
    expect(response.headers['content-type']).toMatch(/application\/json/);
    expect(response.body).toEqual({ error: 'Amount must be positive' });
  }
  expect(mod.accounts[0].balance).toBe(100);
  expect(source).toMatch(/new\s+HTTPException\(\s*400/);
});

test('unexpected errors answer a generic 500 and are logged, without leaking details', async () => {
  const logs = captureLogs();
  const response = await request(mod.app, '/reports/daily');
  expect(response.status).toBe(500);
  expect(response.body).toEqual({ error: 'Internal Server Error' });
  expect(response.text).not.toMatch(/db-primary|5432|reporting/);
  expect(logs.some((line: string) => line.includes('db-primary.internal'))).toBe(true);
});
