test('evicts the least recently used entry and calls onEvict with it', () => {
  const onEvict = fn();
  const cache = new mod.LruCache({ max: 2, onEvict });
  cache.set('a', 1).set('b', 2);
  expect(onEvict).not.toHaveBeenCalled();
  cache.set('c', 3);
  expect(onEvict).toHaveBeenCalledTimes(1);
  expect(onEvict).toHaveBeenCalledWith('a', 1);
  expect(cache.size).toBe(2);
  expect(cache.get('a')).toBeUndefined();
  expect(cache.keys()).toEqual(['b', 'c']);
});

test('get refreshes recency and has does not', () => {
  const cache = new mod.LruCache({ max: 3 });
  cache.set('a', 1).set('b', 2).set('c', 3);
  expect(cache.get('a')).toBe(1);
  expect(cache.keys()).toEqual(['b', 'c', 'a']);
  expect(cache.has('b')).toBe(true);
  expect(cache.keys()).toEqual(['b', 'c', 'a']);
  cache.set('d', 4);
  expect(cache.has('b')).toBe(false);
  expect(cache.keys()).toEqual(['c', 'a', 'd']);
});

test('updating an existing key refreshes it without evicting', () => {
  const onEvict = fn();
  const cache = new mod.LruCache({ max: 2, onEvict });
  cache.set('a', 1).set('b', 2).set('a', 10);
  expect(onEvict).not.toHaveBeenCalled();
  expect(cache.size).toBe(2);
  expect(cache.keys()).toEqual(['b', 'a']);
  cache.set('c', 3);
  expect(onEvict).toHaveBeenCalledWith('b', 2);
  expect(cache.get('a')).toBe(10);
});

test('delete removes without onEvict and the constructor rejects max < 1', () => {
  const onEvict = fn();
  const cache = new mod.LruCache({ max: 2, onEvict });
  cache.set('a', 1);
  expect(cache.delete('a')).toBe(true);
  expect(cache.delete('a')).toBe(false);
  expect(cache.size).toBe(0);
  expect(onEvict).not.toHaveBeenCalled();
  let error: unknown;
  try {
    new mod.LruCache({ max: 0 });
  } catch (caught) {
    error = caught;
  }
  expect(error).toBeInstanceOf(RangeError);
});

test('200 000 operations on a 10 000-entry cache run in constant time each', () => {
  const evicted: number[] = [];
  const cache = new mod.LruCache({ max: 10_000, onEvict: (key: number) => evicted.push(key) });
  const startedAt = performance.now();
  for (let key = 0; key < 100_000; key++) {
    cache.set(key, key * 2);
    cache.get(key - 5_000);
  }
  const elapsed = performance.now() - startedAt;
  expect(cache.size).toBe(10_000);
  expect(cache.get(99_999)).toBe(199_998);
  expect(evicted.length).toBe(90_000);
  expect(elapsed).toBeLessThan(250);
});
