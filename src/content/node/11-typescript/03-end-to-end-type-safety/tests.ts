const server = () => modules['server.ts'];
const clientFor = () => {
  const fetchMock = fn((input: any, init: any) => server().app.request(input, init));
  return { fetchMock, client: modules['client.ts'].createTodoClient(fetchMock) };
};

test('createTodoSchema in schemas.ts trims titles and requires 1 to 100 characters', () => {
  const { createTodoSchema } = modules['schemas.ts'];
  expect(createTodoSchema.parse({ title: '  Write tests ' })).toEqual({ title: 'Write tests' });
  expect(createTodoSchema.safeParse({ title: '   ' }).success).toBe(false);
  expect(createTodoSchema.safeParse({ title: 'x'.repeat(101) }).success).toBe(false);
});

test('POST /todos validates with the shared schema: 201 with the todo or 400 { error: "Invalid todo" }', async () => {
  const created = await request(server().app, '/todos', { method: 'POST', body: { title: ' Review the PR ' } });
  expect(created.status).toBe(201);
  expect(created.body).toEqual({ id: 3, title: 'Review the PR', done: false });
  const invalid = await request(server().app, '/todos', { method: 'POST', body: { title: '' } });
  expect(invalid.status).toBe(400);
  expect(invalid.body).toEqual({ error: 'Invalid todo' });
});

test('PATCH /todos/:id/toggle flips done, 404 { error: "Todo not found" } and 400 { error: "Invalid id" }', async () => {
  const toggled = await request(server().app, '/todos/2/toggle', { method: 'PATCH' });
  expect(toggled.status).toBe(200);
  expect(toggled.body).toEqual({ id: 2, title: 'Type the client', done: true });
  const missing = await request(server().app, '/todos/99/toggle', { method: 'PATCH' });
  expect(missing.status).toBe(404);
  expect(missing.body).toEqual({ error: 'Todo not found' });
  const invalid = await request(server().app, '/todos/abc/toggle', { method: 'PATCH' });
  expect(invalid.status).toBe(400);
  expect(invalid.body).toEqual({ error: 'Invalid id' });
});

test('the client calls the API through hc<AppType> with the injected fetch', async () => {
  const { client, fetchMock } = clientFor();
  const created = await client.create({ title: 'From the client' });
  expect(created).toEqual({ id: 3, title: 'From the client', done: false });
  expect((await client.toggle(3)).done).toBe(true);
  expect((await client.list()).map((todo: any) => todo.id)).toEqual([1, 2, 3]);
  expect(fetchMock).toHaveBeenCalledTimes(3);
  expect(sources['client.ts']).toMatch(/hc<\s*AppType\s*>/);
  expect(sources['client.ts']).toMatch(/import\s+type\s*\{[^}]*AppType[^}]*\}\s*from\s*['"]\.\/server/);
});

test('client.create validates with the shared schema before sending anything', async () => {
  const { client, fetchMock } = clientFor();
  await expect(client.create({ title: '   ' })).rejects.toThrow();
  expect(fetchMock).not.toHaveBeenCalled();
});

test('client.toggle throws an ApiError with the status and the server message', async () => {
  const { client } = clientFor();
  let error: any;
  try {
    await client.toggle(99);
  } catch (caught) {
    error = caught;
  }
  expect(error).toBeInstanceOf(modules['client.ts'].ApiError);
  expect(error.status).toBe(404);
  expect(error.message).toBe('Todo not found');
});
