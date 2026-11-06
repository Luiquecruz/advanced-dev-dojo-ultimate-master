function setup(options: { ttlMs?: number; jitterMs?: number; randoms?: number[]; load?: (key: string) => Promise<string> } = {}) {
  const clock = { now: 0 };
  const randoms = [...(options.randoms ?? [0.5])];
  const load = fn(options.load ?? (async (key: string) => `${key}@${clock.now}`));
  const cache = mod.createCacheAside({
    load,
    ttlMs: options.ttlMs ?? 1000,
    jitterMs: options.jitterMs ?? 500,
    now: () => clock.now,
    random: () => (randoms.length > 1 ? randoms.shift() : randoms[0]),
  });
  return { clock, load, cache };
}

function deferred() {
  let resolve: (value: string) => void = () => undefined;
  let reject: (error: Error) => void = () => undefined;
  const promise = new Promise<string>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  promise.catch(() => undefined);
  return { promise, resolve, reject };
}

test('a miss loads the key, and the value is served from the cache until its jittered expiry', async () => {
  const { clock, load, cache } = setup({ ttlMs: 1000, jitterMs: 500, randoms: [0.5] });
  expect(await cache.get('user:1')).toBe('user:1@0');
  expect(load).toHaveBeenCalledWith('user:1');
  clock.now = 1249;
  expect(await cache.get('user:1')).toBe('user:1@0');
  expect(load).toHaveBeenCalledTimes(1);
  clock.now = 1250;
  expect(await cache.get('user:1')).toBe('user:1@1250');
  expect(await cache.get('user:2')).toBe('user:2@1250');
  expect(load).toHaveBeenCalledTimes(3);
});

// beginner mistake: every concurrent miss calls load, so a hot key expiring stampedes the database
test('100 concurrent gets on a cold key call load exactly once and share its value', async () => {
  const gate = deferred();
  const { load, cache } = setup({ load: () => gate.promise });
  const pending = Array.from({ length: 100 }, () => cache.get('product:7'));
  expect(load).toHaveBeenCalledTimes(1);
  gate.resolve('keyboard');
  expect(await Promise.all(pending)).toEqual(Array(100).fill('keyboard'));
  expect(await cache.get('product:7')).toBe('keyboard');
  expect(load).toHaveBeenCalledTimes(1);
});

test('a rejected load fails every waiting get, is not cached, and the next get retries', async () => {
  const { load, cache } = setup();
  load.mockRejectedValueOnce(new Error('database timeout'));
  const waiting = [cache.get('user:1'), cache.get('user:1'), cache.get('user:1')];
  for (const promise of waiting) {
    expect((await captureError(promise)).message).toBe('database timeout');
  }
  expect(load).toHaveBeenCalledTimes(1);
  expect(await cache.get('user:1')).toBe('user:1@0');
  expect(load).toHaveBeenCalledTimes(2);
});

test('jitter gives entries loaded together different expiry times', async () => {
  const { clock, load, cache } = setup({ ttlMs: 1000, jitterMs: 500, randoms: [0, 0.999] });
  await cache.get('a');
  await cache.get('b');
  clock.now = 1000;
  expect(await cache.get('a')).toBe('a@1000');
  expect(await cache.get('b')).toBe('b@0');
  clock.now = 1499;
  expect(await cache.get('b')).toBe('b@1499');
  expect(load).toHaveBeenCalledTimes(4);
});

test('invalidate drops the cached value and the in-flight load, whose late result is never stored', async () => {
  const { clock, load, cache } = setup();
  expect(await cache.get('user:1')).toBe('user:1@0');
  clock.now = 10;
  cache.invalidate('user:1');
  expect(await cache.get('user:1')).toBe('user:1@10');
  expect(load).toHaveBeenCalledTimes(2);

  const slow = deferred();
  load.mockImplementationOnce(() => slow.promise);
  const stale = cache.get('user:2');
  cache.invalidate('user:2');
  const fresh = cache.get('user:2');
  expect(load).toHaveBeenCalledTimes(4);
  expect(await fresh).toBe('user:2@10');
  slow.resolve('old row');
  expect(await stale).toBe('old row');
  expect(await cache.get('user:2')).toBe('user:2@10');
  expect(load).toHaveBeenCalledTimes(4);
});

test('forgotten loads that settle while a newer load is in flight, by value or by error, leave the newer load in charge', async () => {
  const { load, cache } = setup();
  const first = deferred();
  const second = deferred();
  const third = deferred();
  load.mockImplementationOnce(() => first.promise);
  load.mockImplementationOnce(() => second.promise);
  load.mockImplementationOnce(() => third.promise);
  const resolvesLate = cache.get('user:3');
  cache.invalidate('user:3');
  const rejectsLate = cache.get('user:3');
  cache.invalidate('user:3');
  const current = cache.get('user:3');
  expect(load).toHaveBeenCalledTimes(3);
  first.resolve('old row');
  expect(await resolvesLate).toBe('old row');
  second.reject(new Error('database timeout'));
  expect((await captureError(rejectsLate)).message).toBe('database timeout');
  const joined = cache.get('user:3');
  expect(load).toHaveBeenCalledTimes(3);
  third.resolve('new row');
  expect(await current).toBe('new row');
  expect(await joined).toBe('new row');
  expect(await cache.get('user:3')).toBe('new row');
  expect(load).toHaveBeenCalledTimes(3);
});
