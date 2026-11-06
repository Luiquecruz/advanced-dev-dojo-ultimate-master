function setup(ttlMs = 1000) {
  const clock = { now: 0 };
  const database = new Map<string, string>([['product:1', 'Keyboard 120'], ['product:2', 'Mouse 45']]);
  const load = fn(async (key: string) => {
    const value = database.get(key);
    if (value === undefined) {
      throw new Error(`no row for ${key}`);
    }
    return value;
  });
  const cache = mod.createReadThroughCache({ load, ttlMs, now: () => clock.now });
  return { clock, database, load, cache };
}

test('the first get is a miss that calls load; later gets within the TTL are hits', async () => {
  const { load, cache } = setup();
  expect(cache.stats()).toEqual({ hits: 0, misses: 0, hitRatio: 0 });
  expect(await cache.get('product:1')).toBe('Keyboard 120');
  expect(await cache.get('product:1')).toBe('Keyboard 120');
  expect(await cache.get('product:1')).toBe('Keyboard 120');
  expect(await cache.get('product:2')).toBe('Mouse 45');
  expect(load).toHaveBeenCalledTimes(2);
  expect(cache.stats()).toEqual({ hits: 2, misses: 2, hitRatio: 0.5 });
});

// beginner mistake: treating the cache as the primary store, so a cached value is served forever and the source of truth is never read again
test('an entry expires one TTL after it was stored, and the next get loads the new value from the source', async () => {
  const { clock, database, load, cache } = setup(1000);
  clock.now = 2000;
  await cache.get('product:1');
  database.set('product:1', 'Keyboard 99');
  clock.now = 2999;
  expect(await cache.get('product:1')).toBe('Keyboard 120');
  clock.now = 3000;
  expect(await cache.get('product:1')).toBe('Keyboard 99');
  expect(load).toHaveBeenCalledTimes(2);
  expect(cache.stats()).toEqual({ hits: 1, misses: 2, hitRatio: 1 / 3 });
});

test('invalidate(key) makes the next get of that key a miss, and leaves other keys cached', async () => {
  const { database, load, cache } = setup();
  await cache.get('product:1');
  await cache.get('product:2');
  database.set('product:1', 'Keyboard 99');
  cache.invalidate('product:1');
  expect(await cache.get('product:1')).toBe('Keyboard 99');
  expect(await cache.get('product:2')).toBe('Mouse 45');
  expect(load).toHaveBeenCalledTimes(3);
  expect(cache.stats()).toMatchObject({ hits: 1, misses: 3 });
});

test('a failed load fails the get, counts as a miss and caches nothing', async () => {
  const { database, load, cache } = setup();
  const error = await captureError(cache.get('product:9'));
  expect(String(error)).toContain('no row for product:9');
  database.set('product:9', 'Monitor 340');
  expect(await cache.get('product:9')).toBe('Monitor 340');
  expect(load).toHaveBeenCalledTimes(2);
  expect(cache.stats()).toMatchObject({ hits: 0, misses: 2 });
});
