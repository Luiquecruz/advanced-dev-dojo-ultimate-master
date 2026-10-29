import { Hono, type Context } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

export const createUserSchema = z.object({
  // TODO: name (trimmed, min 2), email, age (optional int >= 13), role (enum, default 'member')
});

export const listQuerySchema = z.object({
  // TODO: page (coerced int >= 1, default 1) and optional role
});

export interface User {
  id: number;
  name: string;
  email: string;
  age?: number;
  role: 'admin' | 'member';
}

export const users: User[] = [
  { id: 1, name: 'Ada Lovelace', email: 'ada@example.com', role: 'admin' },
  { id: 2, name: 'Alan Turing', email: 'alan@example.com', role: 'member' },
];

export function formatIssues(issues: { path: PropertyKey[]; message: string }[]) {
  // TODO: map each issue to { path: 'a.b', message }
  return [];
}

export const app = new Hono();

// TODO: add zValidator('query', listQuerySchema, hook) and read c.req.valid('query')
app.get('/users', (c) => {
  const role = c.req.query('role');
  const items = role ? users.filter((user) => user.role === role) : users;
  return c.json({ page: Number(c.req.query('page') ?? 1), items });
});

// TODO: add zValidator('json', createUserSchema, hook) and store only validated data
app.post('/users', async (c) => {
  const input = await c.req.json();
  const user = { id: Math.max(0, ...users.map((item) => item.id)) + 1, ...input };
  users.push(user);
  return c.json(user, 201);
});
