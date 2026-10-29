const json = { 'Content-Type': 'application/json' };

test('matchRoute() captures decoded :params and returns null on mismatch', () => {
  expect(mod.matchRoute('/users/:id/posts/:postId', '/users/7/posts/42')).toEqual({ id: '7', postId: '42' });
  expect(mod.matchRoute('/files/:name', '/files/annual%20report.pdf')).toEqual({ name: 'annual report.pdf' });
  expect(mod.matchRoute('/users', '/users')).toEqual({});
  expect(mod.matchRoute('/users/:id', '/users/7/posts')).toBeNull();
  expect(mod.matchRoute('/users/:id', '/teams/7')).toBeNull();
});

test('readJsonBody() parses JSON and rejects bad input with 415, 400 and 413', async () => {
  const listener = mod.createListener([{ method: 'POST', pattern: '/echo', handler: async (req: any) => ({ status: 200, body: await mod.readJsonBody(req, 64) }) }]);
  const ok = await request(listener, '/echo', { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: '{"name":"José"}' });
  expect(ok.status).toBe(200);
  expect(ok.body).toEqual({ name: 'José' });
  const text = await request(listener, '/echo', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: 'hello' });
  expect([text.status, text.body]).toEqual([415, { error: 'Content-Type must be application/json' }]);
  const broken = await request(listener, '/echo', { method: 'POST', headers: json, body: '{"name": ' });
  expect([broken.status, broken.body]).toEqual([400, { error: 'Invalid JSON' }]);
  const empty = await request(listener, '/echo', { method: 'POST', headers: json, body: '' });
  expect(empty.status).toBe(400);
  const big = await request(listener, '/echo', { method: 'POST', headers: json, body: JSON.stringify({ text: 'é'.repeat(40) }) });
  expect([big.status, big.body]).toEqual([413, { error: 'Payload too large' }]);
});

test('createListener() answers 404 for unknown paths and 405 with Allow for known paths', async () => {
  const handler = () => ({ status: 200, body: { ok: true } });
  const listener = mod.createListener([
    { method: 'GET', pattern: '/items/:id', handler },
    { method: 'PUT', pattern: '/items/:id', handler },
    { method: 'GET', pattern: '/items', handler },
  ]);
  expect((await request(listener, '/items/3?fields=name')).body).toEqual({ ok: true });
  const missing = await request(listener, '/nope');
  expect([missing.status, missing.body]).toEqual([404, { error: 'Not found' }]);
  const wrongMethod = await request(listener, '/items/3', { method: 'DELETE' });
  expect([wrongMethod.status, wrongMethod.body]).toEqual([405, { error: 'Method not allowed' }]);
  expect(wrongMethod.headers['allow']).toBe('GET, PUT');
});

test('createListener() maps HttpError to its status and hides unexpected errors behind a 500', async () => {
  const logs = captureLogs();
  const listener = mod.createListener([
    { method: 'GET', pattern: '/teapot', handler: () => { throw new mod.HttpError(418, 'I am a teapot'); } },
    { method: 'GET', pattern: '/crash', handler: async () => { throw new Error('connection to db-internal:5432 refused'); } },
  ]);
  const teapot = await request(listener, '/teapot');
  expect([teapot.status, teapot.body]).toEqual([418, { error: 'I am a teapot' }]);
  const crash = await request(listener, '/crash');
  expect([crash.status, crash.body]).toEqual([500, { error: 'Internal server error' }]);
  expect(crash.headers['content-type']).toMatch(/application\/json/);
  expect(logs.join('\n')).toMatch(/db-internal/);
});

test('GET /users/:id returns the user or 404 { error: "User not found" }', async () => {
  const found = await request(mod.server, '/users/2');
  expect([found.status, found.body]).toEqual([200, { id: 2, name: 'Alan Turing' }]);
  const missing = await request(mod.server, '/users/99');
  expect([missing.status, missing.body]).toEqual([404, { error: 'User not found' }]);
});

test('POST /users validates the body and answers 201 with the new user', async () => {
  const created = await request(mod.server, '/users', { method: 'POST', body: { name: 'Grace Hopper' } });
  expect([created.status, created.body]).toEqual([201, { id: 3, name: 'Grace Hopper' }]);
  expect((await request(mod.server, '/users/3')).body).toEqual({ id: 3, name: 'Grace Hopper' });
  const invalid = await request(mod.server, '/users', { method: 'POST', body: { name: '' } });
  expect([invalid.status, invalid.body]).toEqual([422, { error: 'name is required' }]);
  const tooBig = await request(mod.server, '/users', { method: 'POST', body: { name: 'x'.repeat(2000) } });
  expect(tooBig.status).toBe(413);
  const wrongMethod = await request(mod.server, '/users', { method: 'GET' });
  expect([wrongMethod.status, wrongMethod.headers['allow']]).toEqual([405, 'POST']);
});
