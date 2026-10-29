const sampleUsers = [
  { id: 1, name: 'Ada Lovelace', email: 'ada@example.com' },
  { id: 2, name: 'Alan Turing', email: ' ALAN@example.com' },
  { id: 3, name: 'Ada (work)', email: 'Ada@Example.com ' },
  { id: 4, name: 'Grace Hopper', email: 'grace@example.com' },
];
const sampleOrders = [
  { id: 10, userId: 1, status: 'paid', total: 120 },
  { id: 11, userId: 2, status: 'pending', total: 45 },
  { id: 12, userId: 1, status: 'shipped', total: 199 },
  { id: 13, userId: 99, status: 'paid', total: 340 },
];

test('indexBy maps each key to its item and later items win', () => {
  const index = mod.indexBy(sampleUsers, (user: any) => user.id);
  expect(index).toBeInstanceOf(Map);
  expect(index.size).toBe(4);
  expect(index.get(3)).toBe(sampleUsers[2]);
  const byFirstName = mod.indexBy(sampleUsers, (user: any) => user.name.split(' ')[0]);
  expect(byFirstName.get('Ada')).toBe(sampleUsers[2]);
});

test('groupBy keeps the first-seen order of groups and the input order of items', () => {
  const groups = mod.groupBy(sampleOrders, (order: any) => order.status);
  expect(groups).toBeInstanceOf(Map);
  expect([...groups.keys()]).toEqual(['paid', 'pending', 'shipped']);
  expect(groups.get('paid').map((order: any) => order.id)).toEqual([10, 13]);
  expect(groups.get('shipped')).toEqual([sampleOrders[2]]);
});

test('uniqueEmails trims, lowercases and deduplicates in first-seen order', () => {
  expect(mod.uniqueEmails(sampleUsers)).toEqual(['ada@example.com', 'alan@example.com', 'grace@example.com']);
});

test('withCustomer adds customerName (or null) to copies of the orders', () => {
  const result = mod.withCustomer(sampleOrders, sampleUsers);
  expect(result.map((order: any) => order.customerName)).toEqual(['Ada Lovelace', 'Alan Turing', 'Ada Lovelace', null]);
  expect(result[0]).toEqual({ id: 10, userId: 1, status: 'paid', total: 120, customerName: 'Ada Lovelace' });
  expect(result[0]).not.toBe(sampleOrders[0]);
  expect(sampleOrders[0]).not.toHaveProperty('customerName');
});

test('withCustomer joins 40 000 orders with 40 000 users in linear time', () => {
  const users = Array.from({ length: 40_000 }, (_, index) => ({ id: index + 1, name: `User ${index + 1}`, email: `u${index}@example.com` }));
  const orders = Array.from({ length: 40_000 }, (_, index) => ({ id: index, userId: 40_000 - (index % 40_000), status: 'paid', total: 1 }));
  const startedAt = performance.now();
  const result = mod.withCustomer(orders, users);
  const elapsed = performance.now() - startedAt;
  expect(result[0].customerName).toBe('User 40000');
  expect(result[39_999].customerName).toBe('User 1');
  expect(elapsed).toBeLessThan(300);
});

test('diffIds returns the added and the removed ids', () => {
  expect(mod.diffIds([1, 2, 3, 4], [3, 5, 1, 6])).toEqual({ added: [5, 6], removed: [2, 4] });
  expect(mod.diffIds([], [7])).toEqual({ added: [7], removed: [] });
});
