import { Hono, type Context } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().trim().min(2),
  email: z.email(),
  age: z.number().int().min(13).optional(),
  role: z.enum(['admin', 'member']).default('member'),
});

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  role: z.enum(['admin', 'member']).optional(),
});

export type User = z.infer<typeof createUserSchema> & { id: number };

export const users: User[] = [
  { id: 1, name: 'Ada Lovelace', email: 'ada@example.com', role: 'admin' },
  { id: 2, name: 'Alan Turing', email: 'alan@example.com', role: 'member' },
];

export function formatIssues(issues: { path: PropertyKey[]; message: string }[]) {
  return issues.map((issue) => ({ path: issue.path.map(String).join('.'), message: issue.message }));
}

function onInvalid(result: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }, c: Context) {
  if (!result.success) {
    return c.json({ error: 'Validation failed', issues: formatIssues(result.error!.issues) }, 400);
  }
}

export const app = new Hono();

app.get('/users', zValidator('query', listQuerySchema, onInvalid), (c) => {
  const { page, role } = c.req.valid('query');
  const items = role ? users.filter((user) => user.role === role) : users;
  return c.json({ page, items });
});

app.post('/users', zValidator('json', createUserSchema, onInvalid), (c) => {
  const input = c.req.valid('json');
  const user: User = { id: Math.max(0, ...users.map((item) => item.id)) + 1, ...input };
  users.push(user);
  return c.json(user, 201);
});
