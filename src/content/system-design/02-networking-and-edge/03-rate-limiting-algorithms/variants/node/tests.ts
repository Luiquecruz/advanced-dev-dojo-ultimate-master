const attempts = (count: number, call: () => boolean) => Array.from({ length: count }, call);

test('a token bucket starts full, allows a burst up to its capacity and then rejects', () => {
  let clock = 1_000;
  const bucket = mod.createTokenBucket({ capacity: 5, refillPerSecond: 1, now: () => clock });
  expect(attempts(6, () => bucket.tryRemove())).toEqual([true, true, true, true, true, false]);
  expect(bucket.available()).toBe(0);
});

test('a token bucket refills lazily from the elapsed time, capped at its capacity', () => {
  let clock = 0;
  const bucket = mod.createTokenBucket({ capacity: 4, refillPerSecond: 2, now: () => clock });
  expect(bucket.tryRemove(4)).toBe(true);
  clock = 250;
  expect(bucket.available()).toBe(0.5);
  clock = 1_000;
  expect(bucket.available()).toBe(2);
  expect(bucket.tryRemove(3)).toBe(false);
  expect(bucket.tryRemove(2)).toBe(true);
  clock = 60_000;
  expect(bucket.available()).toBe(4);
});

test('a sliding window counter allows the limit within a window and does not count rejected requests', () => {
  let clock = 0;
  const limiter = mod.createSlidingWindowCounter({ limit: 3, windowMs: 1_000, now: () => clock });
  expect(attempts(5, () => limiter.allow())).toEqual([true, true, true, false, false]);
  clock = 1_500;
  expect(attempts(3, () => limiter.allow())).toEqual([true, true, false]);
});

// beginner mistake: a fixed window that resets at the boundary and lets a second full burst through
test('the sliding window counter rejects the boundary burst a fixed window would allow', () => {
  let clock = 59_000;
  const limiter = mod.createSlidingWindowCounter({ limit: 10, windowMs: 60_000, now: () => clock });
  expect(attempts(10, () => limiter.allow()).every(Boolean)).toBe(true);
  clock = 60_000;
  expect(limiter.allow()).toBe(false);
  clock = 90_000;
  expect(attempts(6, () => limiter.allow())).toEqual([true, true, true, true, true, false]);
});

test('the sliding window counter forgets the previous count after a whole idle window', () => {
  let clock = 0;
  const limiter = mod.createSlidingWindowCounter({ limit: 4, windowMs: 1_000, now: () => clock });
  attempts(4, () => limiter.allow());
  clock = 2_100;
  expect(attempts(5, () => limiter.allow())).toEqual([true, true, true, true, false]);
});
