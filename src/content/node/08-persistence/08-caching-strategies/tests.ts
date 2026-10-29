function deferred() {
  let resolve: (value: any) => void = () => {};
  let reject: (error: any) => void = () => {};
  const promise = new Promise((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

test('a miss calls the loader once and later reads within the TTL are served from the cache', async () => {
  let time = 1_000;
  const cache = new mod.Cache({ ttlMs: 500, now: () => time });
  const load = fn(async () => 'value');
  expect(await cache.getOrLoad('key', load)).toBe('value');
  time = 1_499;
  expect(await cache.getOrLoad('key', load)).toBe('value');
  expect(load).toHaveBeenCalledTimes(1);
  expect(await cache.getOrLoad('other', async () => 'other value')).toBe('other value');
});

test('an entry expires once ttlMs has passed since it was stored', async () => {
  let time = 1_000;
  const cache = new mod.Cache({ ttlMs: 500, now: () => time });
  const values = ['first', 'second'];
  const load = fn(async () => values.shift());
  await cache.getOrLoad('key', load);
  time = 1_500;
  expect(await cache.getOrLoad('key', load)).toBe('second');
  expect(load).toHaveBeenCalledTimes(2);
});

test('concurrent misses for the same key share one in-flight load', async () => {
  const cache = new mod.Cache({ ttlMs: 1_000, now: () => 0 });
  const pending = deferred();
  const load = fn(() => pending.promise);
  const reads = [cache.getOrLoad('key', load), cache.getOrLoad('key', load), cache.getOrLoad('key', load)];
  expect(load).toHaveBeenCalledTimes(1);
  pending.resolve('shared');
  expect(await Promise.all(reads)).toEqual(['shared', 'shared', 'shared']);
});

test('a failed load rejects every waiter, is not cached and is retried by the next read', async () => {
  const cache = new mod.Cache({ ttlMs: 1_000, now: () => 0 });
  let calls = 0;
  const load = fn(async () => {
    calls++;
    if (calls === 1) {
      throw new Error('Database timeout');
    }
    return 'recovered';
  });
  const results = await Promise.allSettled([cache.getOrLoad('key', load), cache.getOrLoad('key', load)]);
  expect(results.map((result: any) => result.reason?.message)).toEqual(['Database timeout', 'Database timeout']);
  expect(await cache.getOrLoad('key', load)).toBe('recovered');
  expect(load).toHaveBeenCalledTimes(2);
});

test('invalidate drops the value, and a load still in flight when invalidated is not stored', async () => {
  const cache = new mod.Cache({ ttlMs: 1_000, now: () => 0 });
  await cache.getOrLoad('key', async () => 'old');
  cache.invalidate('key');
  const pending = deferred();
  const slowRead = cache.getOrLoad('key', () => pending.promise);
  cache.invalidate('key');
  pending.resolve('stale');
  expect(await slowRead).toBe('stale');
  expect(await cache.getOrLoad('key', async () => 'fresh')).toBe('fresh');
});

test('the product service reads through the cache and invalidates after a write', async () => {
  const repository = new mod.ProductRepository();
  const cache = new mod.Cache({ ttlMs: 60_000, now: () => 0 });
  const service = mod.createProductService(repository, cache);
  await Promise.all([service.getProduct(1), service.getProduct(1)]);
  expect(await service.getProduct(1)).toEqual({ id: 1, name: 'Keyboard', price: 120 });
  expect(repository.reads).toBe(1);
  expect(await service.updatePrice(1, 99)).toEqual({ id: 1, name: 'Keyboard', price: 99 });
  expect(await service.getProduct(1)).toEqual({ id: 1, name: 'Keyboard', price: 99 });
  expect(repository.reads).toBe(2);
  expect(await cache.getOrLoad('product:2', async () => 'from cache key')).toBe('from cache key');
  await expect(service.updatePrice(42, 1)).rejects.toThrow('Product not found');
});
