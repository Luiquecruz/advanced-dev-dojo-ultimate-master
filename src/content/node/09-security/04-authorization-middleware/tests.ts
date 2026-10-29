const users: Record<string, any> = {
  'token-ada': { id: 1, name: 'Ada Lovelace', role: 'admin' },
  'token-alan': { id: 2, name: 'Alan Turing', role: 'member' },
  'token-grace': { id: 3, name: 'Grace Hopper', role: 'member' },
};
const authenticate = () => fn(async (token: string) => users[token] ?? null);
const as = (token: string, method = 'GET') => ({ method, headers: { Authorization: `Bearer ${token}` } });

test('public routes work without a token', async () => {
  const response = await request(mod.createApp(authenticate()), '/health');
  expect(response.status).toBe(200);
  expect(response.body).toEqual({ status: 'ok' });
});

test('missing, malformed or unknown bearer tokens get 401 { error: "Unauthorized" } with WWW-Authenticate: Bearer', async () => {
  const check = authenticate();
  const app = mod.createApp(check);
  for (const headers of [{}, { Authorization: 'Basic dXNlcjpwYXNz' }, { Authorization: 'Bearer' }, { Authorization: 'Bearer token-nobody' }]) {
    const response = await request(app, '/api/me', { headers });
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
    expect(response.headers['www-authenticate']).toBe('Bearer');
  }
  expect(check).toHaveBeenCalledTimes(1);
  expect(check).toHaveBeenCalledWith('token-nobody');
});

test('a valid token stores the user for the handlers (GET /api/me)', async () => {
  const response = await request(mod.createApp(authenticate()), '/api/me', as('token-alan'));
  expect(response.status).toBe(200);
  expect(response.body).toEqual(users['token-alan']);
});

test('requireRole answers 403 { error: "Forbidden" } for other roles', async () => {
  const app = mod.createApp(authenticate());
  const member = await request(app, '/api/admin/stats', as('token-alan'));
  expect(member.status).toBe(403);
  expect(member.body).toEqual({ error: 'Forbidden' });
  const admin = await request(app, '/api/admin/stats', as('token-ada'));
  expect(admin.status).toBe(200);
  expect(admin.body).toEqual({ posts: 3 });

  const { Hono } = require('hono');
  const custom = new Hono().use(mod.requireAuth(authenticate())).get('/reports', mod.requireRole('admin', 'member'), (c: any) => c.text('ok'));
  expect((await request(custom, '/reports', as('token-grace'))).text).toBe('ok');
});

test('only the author or an admin can delete a post (object-level authorization)', async () => {
  const app = mod.createApp(authenticate());
  const stranger = await request(app, '/api/posts/1', as('token-grace', 'DELETE'));
  expect(stranger.status).toBe(403);
  expect(stranger.body).toEqual({ error: 'Forbidden' });
  expect((await request(app, '/api/posts/1', as('token-alan', 'DELETE'))).status).toBe(204);
  expect((await request(app, '/api/posts/2', as('token-ada', 'DELETE'))).status).toBe(204);
  expect((await request(app, '/api/admin/stats', as('token-ada'))).body).toEqual({ posts: 1 });
});

test('deleting an unknown post answers 404 { error: "Post not found" }', async () => {
  const app = mod.createApp(authenticate());
  const missing = await request(app, '/api/posts/99', as('token-ada', 'DELETE'));
  expect(missing.status).toBe(404);
  expect(missing.body).toEqual({ error: 'Post not found' });
  expect((await request(app, '/api/posts/3', as('token-alan', 'DELETE'))).status).toBe(204);
  expect((await request(app, '/api/posts/3', as('token-alan', 'DELETE'))).status).toBe(404);
});
