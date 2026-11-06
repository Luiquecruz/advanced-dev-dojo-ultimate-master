function clock() {
  let time = 0;
  return { now: () => time, advance: (ms: number) => { time += ms; } };
}

const failing = () => fn().mockRejectedValue(new Error('timeout'));

test('closed passes results and errors through, and only consecutive failures open the circuit', async () => {
  const time = clock();
  const breaker = mod.createCircuitBreaker({ failureThreshold: 3, openMs: 1_000, now: time.now });
  expect(breaker.state()).toBe('closed');
  expect(await breaker.call(() => Promise.resolve('ok'))).toBe('ok');
  const down = failing();
  expect((await captureError(breaker.call(down))).message).toBe('timeout');
  expect((await captureError(breaker.call(down))).message).toBe('timeout');
  await breaker.call(() => Promise.resolve('ok'));
  await captureError(breaker.call(down));
  await captureError(breaker.call(down));
  expect(breaker.state()).toBe('closed');
  expect((await captureError(breaker.call(down))).message).toBe('timeout');
  expect(breaker.state()).toBe('open');
  expect(down).toHaveBeenCalledTimes(5);
});

test('open fails fast with "circuit open" without calling the dependency until the open period has passed', async () => {
  const time = clock();
  const breaker = mod.createCircuitBreaker({ failureThreshold: 2, openMs: 1_000, now: time.now });
  await captureError(breaker.call(failing()));
  await captureError(breaker.call(failing()));
  const dependency = fn().mockResolvedValue('ok');
  time.advance(999);
  expect((await captureError(breaker.call(dependency))).message).toBe('circuit open');
  expect(dependency).not.toHaveBeenCalled();
  expect(breaker.state()).toBe('open');
  time.advance(1);
  expect(breaker.state()).toBe('half-open');
});

test('half-open allows one trial at a time and a successful trial closes the circuit', async () => {
  const time = clock();
  const breaker = mod.createCircuitBreaker({ failureThreshold: 1, openMs: 500, now: time.now });
  await captureError(breaker.call(failing()));
  time.advance(500);
  let finish: (value: string) => void = () => {};
  const trial = breaker.call(() => new Promise<string>((resolve) => { finish = resolve; }));
  const other = fn().mockResolvedValue('other');
  expect((await captureError(breaker.call(other))).message).toBe('circuit open');
  expect(other).not.toHaveBeenCalled();
  finish('recovered');
  expect(await trial).toBe('recovered');
  expect(breaker.state()).toBe('closed');
  expect(await breaker.call(other)).toBe('other');
});

test('a failed trial opens the circuit again for another open period', async () => {
  const time = clock();
  const breaker = mod.createCircuitBreaker({ failureThreshold: 2, openMs: 1_000, now: time.now });
  await captureError(breaker.call(failing()));
  await captureError(breaker.call(failing()));
  time.advance(1_000);
  expect((await captureError(breaker.call(failing()))).message).toBe('timeout');
  expect(breaker.state()).toBe('open');
  time.advance(999);
  expect((await captureError(breaker.call(fn().mockResolvedValue('ok')))).message).toBe('circuit open');
  time.advance(1);
  expect(await breaker.call(() => Promise.resolve('ok'))).toBe('ok');
  expect(breaker.state()).toBe('closed');
});

// beginner mistake: retrying immediately or after a constant delay instead of exponential backoff with a cap and full jitter
test('the backoff delay grows exponentially, is capped and is scaled by random()', () => {
  const options = (value: number) => ({ baseMs: 100, capMs: 2_000, random: () => value });
  expect([0, 1, 2, 3, 4].map((attempt) => mod.backoffDelay(attempt, options(0.999_999)))).toEqual([99, 199, 399, 799, 1_599]);
  expect(mod.backoffDelay(5, options(0.999_999))).toBe(1_999);
  expect(mod.backoffDelay(12, options(0.5))).toBe(1_000);
  expect(mod.backoffDelay(3, options(0.25))).toBe(200);
  expect(mod.backoffDelay(3, options(0))).toBe(0);
});
