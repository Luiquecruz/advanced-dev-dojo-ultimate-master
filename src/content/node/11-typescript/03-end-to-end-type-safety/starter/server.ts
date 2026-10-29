import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createTodoSchema, todoParamsSchema, type Todo } from './schemas';

export const todos: Todo[] = [
  { id: 1, title: 'Share the schemas', done: true },
  { id: 2, title: 'Type the client', done: false },
];

export const app = new Hono().get('/todos', (c) => c.json(todos, 200));
// TODO: chain .post('/todos', ...) validated with createTodoSchema (400 { error: 'Invalid todo' }, 201 with the todo)
// TODO: chain .patch('/todos/:id/toggle', ...) validated with todoParamsSchema (400 { error: 'Invalid id' }, 404 { error: 'Todo not found' }, 200)

export type AppType = typeof app;
