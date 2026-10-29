test('GET /health answers 200 with { status: "ok" } as JSON', async () => {
  const response = await request(mod.server, '/health');
  expect(response.status).toBe(200);
  expect(response.headers['content-type']).toMatch(/application\/json/);
  expect(response.body).toEqual({ status: 'ok' });
});

test('GET /todos returns every todo and ?done= filters them', async () => {
  expect((await request(mod.server, '/todos')).body).toEqual(mod.todos);
  expect((await request(mod.server, '/todos?done=true')).body.map((todo: any) => todo.id)).toEqual([1]);
  expect((await request(mod.server, '/todos?done=false')).body.map((todo: any) => todo.id)).toEqual([2, 3]);
});

test('GET /todos/:id returns the todo or 404 { error: "Todo not found" }', async () => {
  const found = await request(mod.server, '/todos/2');
  expect(found.status).toBe(200);
  expect(found.body).toEqual({ id: 2, title: 'Write a server with node:http', done: false });
  const missing = await request(mod.server, '/todos/99');
  expect(missing.status).toBe(404);
  expect(missing.body).toEqual({ error: 'Todo not found' });
});

test('unknown paths and other methods answer 404 { error: "Not found" }', async () => {
  for (const [path, method] of [['/nope', 'GET'], ['/todos', 'DELETE'], ['/health', 'POST']]) {
    const response = await request(mod.server, path, { method });
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Not found' });
  }
});

test('sendJson sets the JSON content type and serializes the data', async () => {
  const response = await request((req: any, res: any) => mod.sendJson(res, 201, { created: true }), '/');
  expect(response.status).toBe(201);
  expect(response.headers['content-type']).toBe('application/json');
  expect(response.text).toBe('{"created":true}');
});

test('the server is reachable with fetch once it listens', async () => {
  const response = await fetch(`http://localhost:${mod.server.address().port}/health`);
  expect(await response.json()).toEqual({ status: 'ok' });
});
