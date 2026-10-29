const seed = () => new mod.InMemoryDatabase([
  { id: 'a', owner: 'Ada', balance: 100 },
  { id: 'b', owner: 'Alan', balance: 50 },
]);

test('transaction commits the writes when the work resolves and returns its value', async () => {
  const db = seed();
  const result = await db.transaction(async (tx: any) => {
    tx.saveAccount({ ...tx.getAccount('a'), balance: 70 });
    tx.saveAccount({ id: 'c', owner: 'Grace', balance: 5 });
    return 'done';
  });
  expect(result).toBe('done');
  expect(db.getAccount('a').balance).toBe(70);
  expect(db.getAccount('c')).toEqual({ id: 'c', owner: 'Grace', balance: 5 });
});

test('when the work throws, every write is rolled back and the same error rejects', async () => {
  const db = seed();
  const failure = new Error('boom');
  await expect(db.transaction(async (tx: any) => {
    tx.saveAccount({ ...tx.getAccount('a'), balance: 0 });
    tx.saveAccount({ ...tx.getAccount('b'), balance: 150 });
    throw failure;
  })).rejects.toBe(failure);
  expect(db.getAccount('a').balance).toBe(100);
  expect(db.getAccount('b').balance).toBe(50);
});

test('uncommitted writes are visible inside the transaction but not outside', async () => {
  const db = seed();
  let inside = -1;
  let outside = -1;
  await db.transaction(async (tx: any) => {
    tx.saveAccount({ ...tx.getAccount('a'), balance: 0 });
    inside = tx.getAccount('a').balance;
    await sleep(5);
    outside = db.getAccount('a').balance;
  });
  expect(inside).toBe(0);
  expect(outside).toBe(100);
  expect(db.getAccount('a').balance).toBe(0);
});

test('transactions run one at a time, so read-modify-write never loses updates, even after a failure', async () => {
  const db = seed();
  const increment = () => db.transaction(async (tx: any) => {
    const account = tx.getAccount('a');
    await sleep(5);
    tx.saveAccount({ ...account, balance: account.balance + 10 });
  });
  const failing = db.transaction(async () => {
    throw new Error('fails');
  });
  const results = await Promise.allSettled([increment(), failing, increment(), increment()]);
  expect(results.map((result: any) => result.status)).toEqual(['fulfilled', 'rejected', 'fulfilled', 'fulfilled']);
  expect(db.getAccount('a').balance).toBe(130);
});

test('transfer moves money and rejects invalid transfers without changing balances', async () => {
  const db = seed();
  await mod.transfer(db, 'a', 'b', 30);
  expect([db.getAccount('a').balance, db.getAccount('b').balance]).toEqual([70, 80]);
  await expect(mod.transfer(db, 'a', 'b', 0)).rejects.toThrow('Amount must be positive');
  await expect(mod.transfer(db, 'a', 'zzz', 10)).rejects.toThrow('Account not found: zzz');
  await expect(mod.transfer(db, 'nope', 'b', 10)).rejects.toThrow('Account not found: nope');
  await expect(mod.transfer(db, 'a', 'b', 71)).rejects.toBeInstanceOf(mod.InsufficientFundsError);
  expect([db.getAccount('a').balance, db.getAccount('b').balance]).toEqual([70, 80]);
});

test('concurrent transfers cannot overdraw an account', async () => {
  const db = seed();
  const results = await Promise.allSettled([mod.transfer(db, 'a', 'b', 60), mod.transfer(db, 'a', 'b', 60), mod.transfer(db, 'a', 'b', 60)]);
  expect(results.filter((result: any) => result.status === 'fulfilled')).toHaveLength(1);
  expect(results.filter((result: any) => result.status === 'rejected' && result.reason instanceof mod.InsufficientFundsError)).toHaveLength(2);
  expect([db.getAccount('a').balance, db.getAccount('b').balance]).toEqual([40, 110]);
});
