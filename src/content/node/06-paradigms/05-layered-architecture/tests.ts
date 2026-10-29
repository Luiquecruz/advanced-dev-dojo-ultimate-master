test('GET /tasks lists the tasks, GET /tasks/:id returns one or 404', async () => {
  const list = await request(mod.app, '/tasks');
  expect(list.status).toBe(200);
  expect(list.body.map((task: any) => task.id)).toEqual([1, 2]);
  expect((await request(mod.app, '/tasks/2')).body).toEqual({ id: 2, title: 'Write the service', done: false });
  const missing = await request(mod.app, '/tasks/9');
  expect(missing.status).toBe(404);
  expect(missing.body).toEqual({ error: 'Task 9 not found' });
});

test('POST /tasks trims the title and answers 201, or 400 { error: "Title is required" }', async () => {
  const created = await request(mod.app, '/tasks', { method: 'POST', body: { title: '  Ship it  ' } });
  expect(created.status).toBe(201);
  expect(created.body).toEqual({ id: 3, title: 'Ship it', done: false });
  for (const body of [{ title: '   ' }, {}]) {
    const invalid = await request(mod.app, '/tasks', { method: 'POST', body });
    expect(invalid.status).toBe(400);
    expect(invalid.body).toEqual({ error: 'Title is required' });
  }
});

test('an open task title cannot be duplicated (409) but a done title can be reused', async () => {
  const duplicate = await request(mod.app, '/tasks', { method: 'POST', body: { title: 'Write the service' } });
  expect(duplicate.status).toBe(409);
  expect(duplicate.body).toEqual({ error: 'A task named "Write the service" is already open' });
  expect((await request(mod.app, '/tasks', { method: 'POST', body: { title: 'Write the repository' } })).status).toBe(201);
});

test('POST /tasks/:id/complete marks the task done, then answers 409; unknown ids answer 404', async () => {
  const done = await request(mod.app, '/tasks/2/complete', { method: 'POST' });
  expect(done.status).toBe(200);
  expect(done.body).toEqual({ id: 2, title: 'Write the service', done: true });
  const again = await request(mod.app, '/tasks/2/complete', { method: 'POST' });
  expect(again.status).toBe(409);
  expect(again.body).toEqual({ error: 'Task 2 is already done' });
  expect((await request(mod.app, '/tasks/9/complete', { method: 'POST' })).status).toBe(404);
});

test('the service enforces the rules without HTTP, and unknown errors become a 500 without details', async () => {
  const { TaskService } = modules['service.ts'];
  const { InMemoryTaskRepository } = modules['repository.ts'];
  const { ConflictError, ValidationError } = modules['errors.ts'];
  const service = new TaskService(new InMemoryTaskRepository([{ id: 7, title: 'Done already', done: true }]));
  await expect(service.complete(7)).rejects.toBeInstanceOf(ConflictError);
  await expect(service.create(' ')).rejects.toBeInstanceOf(ValidationError);
  captureLogs();
  const broken = { ...new InMemoryTaskRepository(), findAll: async () => { throw new Error('connection refused at 10.0.0.5'); } };
  const failure = await request(mod.createApp(broken), '/tasks');
  expect(failure.status).toBe(500);
  expect(failure.body).toEqual({ error: 'Internal server error' });
});

test('layers depend in one direction: the service knows no HTTP and routes know no repository', () => {
  expect(sources['service.ts']).not.toMatch(/from\s+['"]hono|HTTPException|\b(400|404|409|500)\b/);
  expect(sources['routes.ts']).not.toMatch(/repository|Repository/);
  expect(sources['routes.ts']).toMatch(/instanceof\s+NotFoundError/);
});
