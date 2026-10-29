const collect = () => {
  const lines: any[] = [];
  return { lines, write: (line: string) => lines.push(JSON.parse(line)) };
};
const fixedTime = () => new Date('2026-03-01T15:04:05.000Z');

test('the logger writes one JSON line per call and skips levels below the minimum', () => {
  const { lines, write } = collect();
  const logger = mod.createLogger({ level: 'info', write, now: fixedTime });
  logger.debug('cache miss', { key: 'user:1' });
  logger.info('order created', { orderId: 7, total: 120 });
  logger.error('payment failed', { orderId: 7 });
  expect(lines).toEqual([
    { level: 'info', time: '2026-03-01T15:04:05.000Z', msg: 'order created', orderId: 7, total: 120 },
    { level: 'error', time: '2026-03-01T15:04:05.000Z', msg: 'payment failed', orderId: 7 },
  ]);
});

test('child loggers add bindings, sensitive keys are redacted and errors are serialized', () => {
  const { lines, write } = collect();
  const logger = mod.createLogger({ write, now: fixedTime, bindings: { service: 'billing' } });
  const child = logger.child({ requestId: 'req-1' });
  child.warn('login failed', { userId: 42, password: 'hunter2', Authorization: 'Bearer abc', err: new TypeError('boom') });
  expect(lines[0]).toEqual(
    expect.objectContaining({ level: 'warn', msg: 'login failed', service: 'billing', requestId: 'req-1', userId: 42, password: '[REDACTED]', Authorization: '[REDACTED]' }),
  );
  expect(lines[0].err).toEqual(expect.objectContaining({ name: 'TypeError', message: 'boom' }));
  logger.info('no request here');
  expect(lines[1]).not.toHaveProperty('requestId');
});

test('withObservability reuses or generates the request id and passes a child logger', async () => {
  const { lines, write } = collect();
  const listener = mod.withObservability(
    (req: any, res: any, log: any) => {
      log.info('loading orders');
      res.end('ok');
    },
    { logger: mod.createLogger({ write, now: fixedTime }) },
  );
  const given = await request(listener, '/orders', { headers: { 'x-request-id': 'abc-123' } });
  expect(given.headers['x-request-id']).toBe('abc-123');
  expect(lines[0]).toEqual(expect.objectContaining({ msg: 'loading orders', requestId: 'abc-123' }));
  const generated = await request(listener, '/orders');
  expect(generated.headers['x-request-id']).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  expect(lines.some((line) => line.requestId === generated.headers['x-request-id'])).toBe(true);
});

test('one access log line per request with method, path without query, status and duration', async () => {
  const { lines, write } = collect();
  const ticks = [1_000, 1_042.4];
  const listener = mod.withObservability(
    (req: any, res: any) => {
      res.statusCode = 201;
      res.end('{}');
    },
    { logger: mod.createLogger({ write, now: fixedTime }), now: () => ticks.shift() },
  );
  await request(listener, '/orders?token=secret', { method: 'POST', headers: { 'x-request-id': 'r-9' } });
  const completed = lines.filter((line) => line.msg === 'request completed');
  expect(completed).toEqual([
    { level: 'info', time: '2026-03-01T15:04:05.000Z', msg: 'request completed', requestId: 'r-9', method: 'POST', path: '/orders', status: 201, durationMs: 42 },
  ]);
});

test('a failing handler is logged with its request id and answered with 500', async () => {
  const { lines, write } = collect();
  const listener = mod.withObservability(
    async () => {
      throw new Error('database unreachable');
    },
    { logger: mod.createLogger({ write, now: fixedTime }) },
  );
  const response = await request(listener, '/orders', { headers: { 'x-request-id': 'r-500' } });
  expect(response.status).toBe(500);
  expect(response.body).toEqual({ error: 'Internal Server Error' });
  const failure = lines.find((line) => line.msg === 'request failed');
  expect(failure).toEqual(expect.objectContaining({ level: 'error', requestId: 'r-500' }));
  expect(failure.err.message).toBe('database unreachable');
  expect(lines.find((line) => line.msg === 'request completed').status).toBe(500);
});

test('percentile uses the nearest-rank method', () => {
  const values = Array.from({ length: 100 }, (_, index) => 100 - index);
  expect(mod.percentile(values, 50)).toBe(50);
  expect(mod.percentile(values, 95)).toBe(95);
  expect(mod.percentile(values, 99)).toBe(99);
  expect(mod.percentile([12, 15, 11, 2_400], 50)).toBe(12);
  expect(mod.percentile([12, 15, 11, 2_400], 0)).toBe(11);
  expect(mod.percentile([], 95)).toBe(0);
  expect(values[0]).toBe(100);
});
