const origin = 'https://app.example.com';
const setup = () => {
  const log = fn();
  return { log, app: mod.createApp({ allowedOrigins: [origin], log }) };
};

test('every response carries X-Request-Id and a valid incoming id is reused', async () => {
  const { app } = setup();
  const generated = await request(app, '/api/me');
  expect(generated.headers['x-request-id']).toMatch(/^[\w-]{8,}$/);
  const reused = await request(app, '/api/me', { headers: { 'X-Request-Id': 'checkout-42' } });
  expect(reused.headers['x-request-id']).toBe('checkout-42');
});

test('log() receives one structured entry per request with the same request id', async () => {
  const { app, log } = setup();
  const response = await request(app, '/api/me');
  expect(response.body).toEqual({ id: 1, name: 'Ada' });
  expect(log).toHaveBeenCalledTimes(1);
  const entry = log.mock.calls[0][0];
  expect(entry).toEqual({ requestId: response.headers['x-request-id'], method: 'GET', path: '/api/me', status: 200, durationMs: expect.any(Number) });
});

test('failed requests and unknown routes are logged with their status', async () => {
  const { app, log } = setup();
  expect((await request(app, '/api/fail')).status).toBe(500);
  expect((await request(app, '/missing', { method: 'POST' })).status).toBe(404);
  expect(log.mock.calls.map((call: any[]) => [call[0].method, call[0].path, call[0].status])).toEqual([
    ['GET', '/api/fail', 500],
    ['POST', '/missing', 404],
  ]);
});

test('CORS allows only the configured origins and answers preflights', async () => {
  const { app } = setup();
  const allowed = await request(app, '/api/me', { headers: { Origin: origin } });
  expect(allowed.headers['access-control-allow-origin']).toBe(origin);
  expect(allowed.headers['access-control-expose-headers']).toMatch(/X-Request-Id/i);
  const blocked = await request(app, '/api/me', { headers: { Origin: 'https://evil.example' } });
  expect(blocked.headers['access-control-allow-origin']).toBeUndefined();
  const preflight = await request(app, '/api/me', { method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'PATCH' } });
  expect(preflight.status).toBe(204);
  expect(preflight.headers['access-control-allow-methods']).toBe('GET,POST,PATCH,DELETE');
});

test('Server-Timing reports the db metric and the total', async () => {
  const { app } = setup();
  const response = await request(app, '/api/me');
  expect(response.headers['server-timing']).toMatch(/\bdb;dur=/);
  expect(response.headers['server-timing']).toMatch(/\btotal;dur=/);
});
