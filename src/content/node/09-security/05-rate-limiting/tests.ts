function clock(start = 0) {
  const state = { time: start };
  return { state, now: () => state.time };
}

test('FixedWindowLimiter allows `limit` requests per key and window, then reports when the window ends', () => {
  const { state, now } = clock(10_000);
  const limiter = new mod.FixedWindowLimiter({ limit: 3, windowMs: 1_000, now });
  expect([1, 2, 3].map(() => limiter.consume('a'))).toEqual([
    { allowed: true, remaining: 2, retryAfterMs: 0 },
    { allowed: true, remaining: 1, retryAfterMs: 0 },
    { allowed: true, remaining: 0, retryAfterMs: 0 },
  ]);
  state.time = 10_250;
  expect(limiter.consume('a')).toEqual({ allowed: false, remaining: 0, retryAfterMs: 750 });
  expect(limiter.consume('b')).toEqual({ allowed: true, remaining: 2, retryAfterMs: 0 });
  state.time = 11_000;
  expect(limiter.consume('a')).toEqual({ allowed: true, remaining: 2, retryAfterMs: 0 });
});

test('fixed windows are aligned to multiples of windowMs (a burst can straddle the boundary)', () => {
  const { state, now } = clock(10_999);
  const limiter = new mod.FixedWindowLimiter({ limit: 2, windowMs: 1_000, now });
  expect([limiter.consume('a').allowed, limiter.consume('a').allowed, limiter.consume('a').allowed]).toEqual([true, true, false]);
  state.time = 11_000;
  expect([limiter.consume('a').allowed, limiter.consume('a').allowed, limiter.consume('a').allowed]).toEqual([true, true, false]);
});

test('TokenBucketLimiter starts full, refills continuously and says when the next token arrives', () => {
  const { state, now } = clock(0);
  const limiter = new mod.TokenBucketLimiter({ capacity: 3, refillPerSecond: 2, now });
  expect([1, 2, 3].map(() => limiter.consume('a').remaining)).toEqual([2, 1, 0]);
  expect(limiter.consume('a')).toEqual({ allowed: false, remaining: 0, retryAfterMs: 500 });
  state.time = 250;
  expect(limiter.consume('a')).toEqual({ allowed: false, remaining: 0, retryAfterMs: 250 });
  state.time = 500;
  expect(limiter.consume('a')).toEqual({ allowed: true, remaining: 0, retryAfterMs: 0 });
  expect(limiter.consume('b')).toEqual({ allowed: true, remaining: 2, retryAfterMs: 0 });
});

test('a token bucket never holds more than its capacity', () => {
  const { state, now } = clock(0);
  const limiter = new mod.TokenBucketLimiter({ capacity: 3, refillPerSecond: 2, now });
  limiter.consume('a');
  state.time = 60_000;
  const results = [1, 2, 3, 4].map(() => limiter.consume('a'));
  expect(results.map((result: any) => result.allowed)).toEqual([true, true, true, false]);
  expect(results[0].remaining).toBe(2);
});

test('the middleware answers 429 with Retry-After and sets X-RateLimit-Remaining per API key', async () => {
  const { now } = clock(0);
  const app = mod.createApp(new mod.FixedWindowLimiter({ limit: 2, windowMs: 60_000, now }));
  const headers = { 'X-Api-Key': 'key-a' };
  const first = await request(app, '/api/data', { headers });
  expect(first.status).toBe(200);
  expect(first.body).toEqual({ ok: true });
  expect(first.headers['x-ratelimit-remaining']).toBe('1');
  expect((await request(app, '/api/data', { headers })).headers['x-ratelimit-remaining']).toBe('0');
  const blocked = await request(app, '/api/data', { headers });
  expect(blocked.status).toBe(429);
  expect(blocked.body).toEqual({ error: 'Too many requests' });
  expect(blocked.headers['retry-after']).toBe('60');
  expect(blocked.headers['x-ratelimit-remaining']).toBe('0');
  expect((await request(app, '/api/data', { headers: { 'X-Api-Key': 'key-b' } })).status).toBe(200);
  for (let index = 0; index < 5; index++) {
    expect((await request(app, '/health')).status).toBe(200);
  }
});

test('rateLimit works with any RateLimiter and rounds Retry-After up to whole seconds', async () => {
  const limiter = { consume: fn(() => ({ allowed: false, remaining: 0, retryAfterMs: 1_500 })) };
  const response = await request(mod.createApp(limiter), '/api/data');
  expect(limiter.consume).toHaveBeenCalledWith('anonymous');
  expect(response.status).toBe(429);
  expect(response.headers['retry-after']).toBe('2');
});
