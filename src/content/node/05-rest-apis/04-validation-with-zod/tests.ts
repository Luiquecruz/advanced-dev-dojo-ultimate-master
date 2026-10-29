test('POST /users answers 201 with the parsed data: trimmed name, default role, new id', async () => {
  const created = await request(mod.app, '/users', { method: 'POST', body: { name: '  Grace Hopper ', email: 'grace@example.com', age: 36 } });
  expect(created.status).toBe(201);
  expect(created.body).toEqual({ id: 3, name: 'Grace Hopper', email: 'grace@example.com', age: 36, role: 'member' });
});

test('POST /users drops unknown fields such as isAdmin', async () => {
  const created = await request(mod.app, '/users', { method: 'POST', body: { name: 'Mallory', email: 'mallory@example.com', isAdmin: true } });
  expect(created.status).toBe(201);
  expect(created.body).not.toHaveProperty('isAdmin');
  expect(mod.users[mod.users.length - 1]).not.toHaveProperty('isAdmin');
});

test('invalid bodies answer 400 { error: "Validation failed", issues } listing every invalid field', async () => {
  const invalid = await request(mod.app, '/users', { method: 'POST', body: { name: 'A', email: 'not-an-email', age: 9.5, role: 'owner' } });
  expect(invalid.status).toBe(400);
  expect(invalid.body.error).toBe('Validation failed');
  const paths = invalid.body.issues.map((issue: any) => issue.path).sort();
  expect(paths).toEqual(['age', 'email', 'name', 'role']);
  invalid.body.issues.forEach((issue: any) => expect(issue.message).toEqual(expect.any(String)));
  expect(mod.users).toHaveLength(2);
});

test('formatIssues joins nested paths with dots', () => {
  expect(mod.formatIssues([{ path: ['address', 'city'], message: 'Required' }, { path: ['tags', 0], message: 'Too long' }])).toEqual([
    { path: 'address.city', message: 'Required' },
    { path: 'tags.0', message: 'Too long' },
  ]);
});

test('GET /users coerces ?page=, filters by ?role= and rejects invalid queries', async () => {
  expect((await request(mod.app, '/users')).body).toEqual({ page: 1, items: mod.users });
  const admins = await request(mod.app, '/users?page=2&role=admin');
  expect(admins.body).toEqual({ page: 2, items: [mod.users[0]] });
  const invalid = await request(mod.app, '/users?page=0&role=owner');
  expect(invalid.status).toBe(400);
  expect(invalid.body.issues.map((issue: any) => issue.path).sort()).toEqual(['page', 'role']);
});

test('the routes use zValidator', () => {
  expect(source).toMatch(/zValidator\(\s*['"]json['"]/);
  expect(source).toMatch(/zValidator\(\s*['"]query['"]/);
});
