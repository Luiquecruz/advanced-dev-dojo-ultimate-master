function context(overrides: Record<string, unknown> = {}) {
  return { method: 'GET', path: '/', requestHeaders: {}, status: 404, body: undefined, responseHeaders: {}, ...overrides } as any;
}

test('compose() runs middleware like an onion and resolves after the whole chain', async () => {
  const order: string[] = [];
  const layer = (name: string) => async (_ctx: any, next: any) => {
    order.push(`${name} in`);
    await sleep(1);
    await next();
    order.push(`${name} out`);
  };
  const final = fn(async () => {
    order.push('final');
  });
  await mod.compose([layer('a'), layer('b')])(context(), final);
  expect(order).toEqual(['a in', 'b in', 'final', 'b out', 'a out']);
  expect(final).toHaveBeenCalledTimes(1);
});

test('compose() stops when a middleware does not call next and rejects on errors, even synchronous ones', async () => {
  const skipped = fn();
  const ctx = context();
  await mod.compose([(c: any) => { c.status = 204; }, skipped])(ctx);
  expect(ctx.status).toBe(204);
  expect(skipped).not.toHaveBeenCalled();
  await expect(mod.compose([async (_c: any, next: any) => next(), () => { throw new Error('sync boom'); }])(context())).rejects.toThrow('sync boom');
});

test('compose() rejects with "next() called multiple times"', async () => {
  const twice = async (_ctx: any, next: any) => {
    await next();
    await next();
  };
  await expect(mod.compose([twice, async () => {}])(context())).rejects.toThrow('next() called multiple times');
});

test('errorHandler keeps 4xx errors and hides other errors behind a logged 500', async () => {
  const logs = captureLogs();
  const notFound = context();
  await mod.compose([mod.errorHandler, () => { throw Object.assign(new Error('Report not found'), { status: 404 }); }])(notFound);
  expect([notFound.status, notFound.body]).toEqual([404, { error: 'Report not found' }]);
  const crash = context();
  await mod.compose([mod.errorHandler, async () => { throw new Error('db password expired'); }])(crash);
  expect([crash.status, crash.body]).toEqual([500, { error: 'Internal server error' }]);
  expect(logs.join('\n')).toMatch(/db password expired/);
});

test('responseTime() measures the downstream time and requireApiKey() short-circuits with 401', async () => {
  const times = [1000, 1042];
  const now = fn(() => times.shift());
  const timed = context();
  await mod.compose([mod.responseTime(now), async (c: any) => { c.status = 200; }])(timed);
  expect(timed.responseHeaders['X-Response-Time']).toBe('42ms');
  const handler = fn();
  const denied = context({ requestHeaders: { 'x-api-key': 'wrong' } });
  await mod.compose([mod.requireApiKey('secret'), handler])(denied);
  expect([denied.status, denied.body]).toEqual([401, { error: 'Unauthorized' }]);
  expect(handler).not.toHaveBeenCalled();
  await mod.compose([mod.requireApiKey('secret'), handler])(context({ requestHeaders: { 'x-api-key': 'secret' } }));
  expect(handler).toHaveBeenCalledTimes(1);
});

test('the app answers through the whole pipeline', async () => {
  captureLogs();
  const headers = { 'x-api-key': 'dev-key' };
  const ok = await request(mod.app, '/reports', { headers });
  expect([ok.status, ok.body]).toEqual([200, { reports: ['daily', 'weekly'] }]);
  expect(ok.headers['content-type']).toMatch(/application\/json/);
  expect(ok.headers['x-response-time']).toMatch(/^\d+ms$/);
  expect((await request(mod.app, '/reports')).status).toBe(401);
  expect((await request(mod.app, '/missing', { headers })).body).toEqual({ error: 'Not found' });
  expect((await request(mod.app, '/forbidden', { headers })).status).toBe(403);
  const crash = await request(mod.app, '/boom', { headers });
  expect([crash.status, crash.body]).toEqual([500, { error: 'Internal server error' }]);
  const unsafe = await request(mod.createListener([() => { throw new Error('no error handler'); }]), '/');
  expect([unsafe.status, unsafe.body]).toEqual([500, { error: 'Internal server error' }]);
});
