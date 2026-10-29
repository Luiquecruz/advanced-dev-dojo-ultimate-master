function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

test('loadDashboard starts the user, orders and recommendations calls at the same time', async () => {
  const user = deferred<any>();
  const orders = deferred<any>();
  const recommendations = deferred<any>();
  const api = { getUser: fn(() => user.promise), getOrders: fn(() => orders.promise), getRecommendations: fn(() => recommendations.promise) };
  const pending = mod.loadDashboard(api);
  await sleep(5);
  expect(api.getUser).toHaveBeenCalledTimes(1);
  expect(api.getOrders).toHaveBeenCalledTimes(1);
  expect(api.getRecommendations).toHaveBeenCalledTimes(1);
  user.resolve({ id: 1, name: 'Ada' });
  orders.resolve([]);
  recommendations.resolve([]);
  await pending;
});

test('loadDashboard falls back to [] for failed recommendations but rejects when user or orders fail', async () => {
  const ok = {
    getUser: async () => ({ id: 1, name: 'Ada' }),
    getOrders: async () => [{ id: 7, total: 30 }],
    getRecommendations: async () => {
      throw new Error('recommender down');
    },
  };
  await expect(mod.loadDashboard(ok)).resolves.toEqual({ user: { id: 1, name: 'Ada' }, orders: [{ id: 7, total: 30 }], recommendations: [] });
  const broken = { ...ok, getRecommendations: async () => ['book'], getOrders: async () => { throw new Error('orders db down'); } };
  await expect(mod.loadDashboard(broken)).rejects.toThrow('orders db down');
});

test('sendAll reports every sent and failed channel and never rejects', async () => {
  const report = await mod.sendAll({
    email: async () => 'ok',
    sms: async () => {
      throw new Error('no credit');
    },
    push: async () => 'ok',
    slack: () => Promise.reject(new Error('webhook gone')),
  });
  expect(report).toEqual({
    sent: ['email', 'push'],
    failed: [
      { name: 'sms', reason: 'no credit' },
      { name: 'slack', reason: 'webhook gone' },
    ],
  });
});

test('fastestMirror resolves with the first success, ignoring faster failures, and rejects "All mirrors failed" when all fail', async () => {
  const download = (url: string) =>
    new Promise((resolve, reject) => {
      if (url === 'eu') setTimeout(() => reject(new Error('eu down')), 1);
      if (url === 'us') setTimeout(() => resolve('file from us'), 10);
      if (url === 'asia') setTimeout(() => resolve('file from asia'), 30);
    });
  await expect(mod.fastestMirror(['eu', 'asia', 'us'], download)).resolves.toBe('file from us');
  const failing = (url: string) => Promise.reject(new Error(`${url} down`));
  await expect(mod.fastestMirror(['eu', 'us'], failing)).rejects.toThrow('All mirrors failed');
});

test('withTimeout resolves fast work and rejects slow work with "Timed out after <ms> ms"', async () => {
  await expect(mod.withTimeout(new Promise((resolve) => setTimeout(() => resolve('fast'), 5)), 50)).resolves.toBe('fast');
  await expect(mod.withTimeout(new Promise((resolve) => setTimeout(() => resolve('slow'), 80)), 15)).rejects.toThrow('Timed out after 15 ms');
});

test('uses Promise.all, Promise.allSettled, Promise.any and Promise.race', async () => {
  expect(source).toMatch(/Promise\.all\s*\(/);
  expect(source).toMatch(/Promise\.allSettled\s*\(/);
  expect(source).toMatch(/Promise\.any\s*\(/);
  expect(source).toMatch(/Promise\.race\s*\(/);
});
