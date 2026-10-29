import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';

export interface User {
  id: number;
  name: string;
  role: 'admin' | 'member';
}

export interface Post {
  id: number;
  authorId: number;
  title: string;
}

export type Authenticate = (token: string) => Promise<User | null>;

export type AppEnv = { Variables: { user: User } };

export function requireAuth(authenticate: Authenticate) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const match = /^Bearer (\S+)$/i.exec(c.req.header('Authorization') ?? '');
    const user = match ? await authenticate(match[1]) : null;
    if (!user) {
      c.header('WWW-Authenticate', 'Bearer');
      return c.json({ error: 'Unauthorized' }, 401);
    }
    c.set('user', user);
    await next();
  });
}

export function requireRole(...roles: User['role'][]) {
  return createMiddleware<AppEnv>(async (c, next) => {
    if (!roles.includes(c.get('user').role)) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    await next();
  });
}

export function createApp(authenticate: Authenticate) {
  const posts = new Map<number, Post>([
    [1, { id: 1, authorId: 2, title: 'Notes on computability' }],
    [2, { id: 2, authorId: 3, title: 'The first compiler' }],
    [3, { id: 3, authorId: 2, title: 'The imitation game' }],
  ]);
  const app = new Hono<AppEnv>();

  app.get('/health', (c) => c.json({ status: 'ok' }));
  app.use('/api/*', requireAuth(authenticate));
  app.get('/api/me', (c) => c.json(c.get('user')));
  app.get('/api/admin/stats', requireRole('admin'), (c) => c.json({ posts: posts.size }));
  app.delete('/api/posts/:id', (c) => {
    const user = c.get('user');
    const post = posts.get(Number(c.req.param('id')));
    if (!post) {
      return c.json({ error: 'Post not found' }, 404);
    }
    if (post.authorId !== user.id && user.role !== 'admin') {
      return c.json({ error: 'Forbidden' }, 403);
    }
    posts.delete(post.id);
    return c.body(null, 204);
  });

  return app;
}

async function main() {
  const users: Record<string, User> = { 'token-ada': { id: 1, name: 'Ada', role: 'admin' } };
  const app = createApp(async (token) => users[token] ?? null);
  const anonymous = await app.request('/api/me');
  console.log(anonymous.status, await anonymous.json());
  const ada = await app.request('/api/admin/stats', { headers: { Authorization: 'Bearer token-ada' } });
  console.log(ada.status, await ada.json());
}

main();
