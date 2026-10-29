const ada = { Authorization: 'Bearer token-ada' };
const alan = { Authorization: 'Bearer token-alan' };
const create = (headers: any, body: any) => request(mod.app, '/bookmarks', { method: 'POST', headers, body });

test('/health is public; /bookmarks needs a known bearer token; unknown routes answer the 404 envelope', async () => {
  expect((await request(mod.app, '/health')).body).toEqual({ status: 'ok' });
  for (const headers of [{}, { Authorization: 'Bearer nope' }, { Authorization: 'token-ada' }]) {
    const response = await request(mod.app, '/bookmarks', { headers });
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: { code: 'UNAUTHORIZED', message: 'Missing or invalid token' } });
  }
  expect((await request(mod.app, '/bookmarks/any-id', { method: 'DELETE' })).status).toBe(401);
  const missing = await request(mod.app, '/nope', { headers: ada });
  expect(missing.status).toBe(404);
  expect(missing.body).toEqual({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
});

test('POST /bookmarks rejects invalid bodies with VALIDATION_FAILED details and malformed JSON with BAD_REQUEST', async () => {
  const invalid = await create(ada, { url: 'javascript:alert(1)', title: '   ' });
  expect(invalid.status).toBe(400);
  expect(invalid.body.error.code).toBe('VALIDATION_FAILED');
  expect(invalid.body.error.message).toBe('Invalid request body');
  expect(invalid.body.error.details.map((detail: any) => detail.path).sort()).toEqual(['title', 'url']);
  const tooMany = await create(ada, { url: 'https://example.com', title: 'Example', tags: ['a', 'b', 'c', 'd', 'e', 'f'] });
  expect(tooMany.body.error.details).toEqual([expect.objectContaining({ path: 'tags' })]);
  const malformed = await request(mod.app, '/bookmarks', { method: 'POST', headers: { ...ada, 'Content-Type': 'application/json' }, body: '{"url":' });
  expect(malformed.status).toBe(400);
  expect(malformed.body.error.code).toBe('BAD_REQUEST');
});

test('POST /bookmarks answers 201 with Location and a normalized bookmark; a duplicate URL for the same owner is 409', async () => {
  const created = await create(ada, { url: 'https://hono.dev', title: '  Hono  ', tags: [' Web ', 'API'] });
  expect(created.status).toBe(201);
  expect(created.body).toEqual({ id: expect.any(String), ownerId: 'u1', url: 'https://hono.dev', title: 'Hono', tags: ['web', 'api'], createdAt: expect.any(String) });
  expect(created.headers.location).toBe(`/bookmarks/${created.body.id}`);
  expect((await create(ada, { url: 'https://zod.dev', title: 'Zod' })).body.tags).toEqual([]);
  const duplicate = await create(ada, { url: 'https://hono.dev', title: 'Again' });
  expect(duplicate.status).toBe(409);
  expect(duplicate.body).toEqual({ error: { code: 'CONFLICT', message: 'Bookmark already exists for this URL' } });
  expect((await create(alan, { url: 'https://hono.dev', title: 'Hono' })).status).toBe(201);
});

test('users only see and delete their own bookmarks; other ids answer 404', async () => {
  const mine = (await create(ada, { url: 'https://nodejs.org', title: 'Node', tags: ['runtime'] })).body;
  await create(ada, { url: 'https://hono.dev', title: 'Hono', tags: ['web'] });
  const theirs = (await create(alan, { url: 'https://zod.dev', title: 'Zod' })).body;
  expect((await request(mod.app, '/bookmarks', { headers: ada })).body.map((bookmark: any) => bookmark.title)).toEqual(['Node', 'Hono']);
  expect((await request(mod.app, '/bookmarks?tag=web', { headers: ada })).body.map((bookmark: any) => bookmark.title)).toEqual(['Hono']);
  expect((await request(mod.app, `/bookmarks/${mine.id}`, { headers: ada })).body).toEqual(mine);
  for (const method of ['GET', 'DELETE']) {
    const response = await request(mod.app, `/bookmarks/${theirs.id}`, { method, headers: ada });
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: { code: 'NOT_FOUND', message: 'Bookmark not found' } });
  }
  const deleted = await request(mod.app, `/bookmarks/${mine.id}`, { method: 'DELETE', headers: ada });
  expect(deleted.status).toBe(204);
  expect(deleted.text).toBe('');
  expect((await request(mod.app, `/bookmarks/${mine.id}`, { headers: ada })).status).toBe(404);
  expect((await request(mod.app, `/bookmarks/${theirs.id}`, { headers: alan })).status).toBe(200);
});

test('createApp uses the injected ids and clock, and unexpected errors become a 500 envelope without details', async () => {
  const { createApp } = modules['app.ts'];
  const { InMemoryBookmarkRepository } = modules['repository.ts'];
  const deps = { repository: new InMemoryBookmarkRepository(), ids: () => 'bm-1', now: () => new Date('2026-03-04T05:06:07Z'), tokens: mod.tokens };
  const created = await request(createApp(deps), '/bookmarks', { method: 'POST', headers: ada, body: { url: 'https://example.com', title: 'Example' } });
  expect(created.body).toEqual({ id: 'bm-1', ownerId: 'u1', url: 'https://example.com', title: 'Example', tags: [], createdAt: '2026-03-04T05:06:07.000Z' });
  const logs = captureLogs();
  const broken = { ...deps, repository: { ...deps.repository, listByOwner: async () => { throw new Error('connection to 10.0.0.5 refused'); } } };
  const failure = await request(createApp(broken), '/bookmarks', { headers: ada });
  expect(failure.status).toBe(500);
  expect(failure.body).toEqual({ error: { code: 'INTERNAL', message: 'Internal server error' } });
  expect(logs.join('\n')).toMatch(/connection to 10\.0\.0\.5 refused/);
});

test('the service holds the rules without HTTP and the layers stay separate', async () => {
  const { BookmarkService } = modules['service.ts'];
  const { InMemoryBookmarkRepository } = modules['repository.ts'];
  const { NotFoundError, ConflictError } = modules['errors.ts'];
  const service = new BookmarkService({ repository: new InMemoryBookmarkRepository(), ids: () => 'bm-9', now: () => new Date(0) });
  await service.create('u1', { url: 'https://example.com', title: 'Example', tags: [] });
  await expect(service.get('u2', 'bm-9')).rejects.toBeInstanceOf(NotFoundError);
  await expect(service.create('u1', { url: 'https://example.com', title: 'Copy', tags: [] })).rejects.toBeInstanceOf(ConflictError);
  expect(sources['service.ts']).not.toMatch(/from\s+['"]hono|c\.json|\b(400|401|404|409|500)\b/);
  expect(sources['app.ts']).toMatch(/zValidator\s*\(\s*['"]json['"]/);
  expect(sources['app.ts']).not.toMatch(/InMemoryBookmarkRepository/);
});
