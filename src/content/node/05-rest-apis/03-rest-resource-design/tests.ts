test('GET /projects/:id returns the project or 404 { error: "Project not found" }', async () => {
  const found = await request(mod.app, '/projects/2');
  expect(found.status).toBe(200);
  expect(found.body).toEqual({ id: 2, slug: 'billing', name: 'Billing Service' });
  const missing = await request(mod.app, '/projects/42');
  expect(missing.status).toBe(404);
  expect(missing.body).toEqual({ error: 'Project not found' });
});

test('POST /projects answers 201 with the project and a Location header', async () => {
  const created = await request(mod.app, '/projects', { method: 'POST', body: { slug: 'search', name: 'Search' } });
  expect(created.status).toBe(201);
  expect(created.body).toEqual({ id: 3, slug: 'search', name: 'Search' });
  expect(created.headers['location']).toBe('/projects/3');
  expect((await request(mod.app, '/projects/3')).body).toEqual(created.body);
});

test('POST /projects answers 409 { error: "Slug already exists" } for a duplicate slug', async () => {
  const duplicate = await request(mod.app, '/projects', { method: 'POST', body: { slug: 'billing', name: 'Another' } });
  expect(duplicate.status).toBe(409);
  expect(duplicate.body).toEqual({ error: 'Slug already exists' });
  expect((await request(mod.app, '/projects')).body).toHaveLength(2);
});

test('PATCH /projects/:id updates only slug and name, with 404 and 409 rules', async () => {
  const renamed = await request(mod.app, '/projects/1', { method: 'PATCH', body: { name: 'Dojo', id: 99 } });
  expect(renamed.status).toBe(200);
  expect(renamed.body).toEqual({ id: 1, slug: 'dev-dojo', name: 'Dojo' });
  const sameSlug = await request(mod.app, '/projects/1', { method: 'PATCH', body: { slug: 'dev-dojo' } });
  expect(sameSlug.status).toBe(200);
  const conflict = await request(mod.app, '/projects/1', { method: 'PATCH', body: { slug: 'billing' } });
  expect(conflict.status).toBe(409);
  expect(conflict.body).toEqual({ error: 'Slug already exists' });
  const missing = await request(mod.app, '/projects/42', { method: 'PATCH', body: { name: 'Ghost' } });
  expect(missing.status).toBe(404);
  expect(missing.body).toEqual({ error: 'Project not found' });
});

test('DELETE /projects/:id answers 204 with an empty body, then 404', async () => {
  const deleted = await request(mod.app, '/projects/2', { method: 'DELETE' });
  expect(deleted.status).toBe(204);
  expect(deleted.text).toBe('');
  expect((await request(mod.app, '/projects/2')).status).toBe(404);
  expect((await request(mod.app, '/projects')).body.map((project: any) => project.id)).toEqual([1]);
  const again = await request(mod.app, '/projects/2', { method: 'DELETE' });
  expect(again.status).toBe(404);
  expect(again.body).toEqual({ error: 'Project not found' });
});
